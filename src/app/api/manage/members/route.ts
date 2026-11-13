import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageLodge, getDb, newId } from '@/lib/db';
import type { Degree, LodgeRole } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: 'add' | 'update';
    lodgeId?: string;
    userId?: string;
    email?: string;
    fullName?: string;
    phone?: string;
    city?: string;
    degree?: Degree;
    role?: LodgeRole;
    officerTitle?: string;
    joinedYear?: number;
  };

  const lodgeId = body.lodgeId || user.activeLodgeId;
  if (!canManageLodge(user, lodgeId)) {
    return NextResponse.json(
      { error: 'Alleen de Secretaris of het Bestuur kan leden beheren.' },
      { status: 403 }
    );
  }

  const db = getDb();

  if (body.action === 'update' && body.userId) {
    const degree = Number(body.degree || 1) as Degree;
    const role: LodgeRole =
      body.role === 'secretary' || body.role === 'board' ? body.role : 'member';
    const officerTitle = (body.officerTitle || '').trim() || null;
    const sortOrder = officerTitle ? 10 : 100;

    if (![1, 2, 3].includes(degree)) {
      return NextResponse.json({ error: 'Ongeldige graad.' }, { status: 400 });
    }

    // Controleer of doelgebruiker daadwerkelijk lid is van deze loge
    const membership = db
      .prepare(
        'SELECT user_id FROM lodge_memberships WHERE user_id = ? AND lodge_id = ?'
      )
      .get(body.userId, lodgeId) as { user_id: string } | undefined;

    if (!membership) {
      return NextResponse.json(
        { error: 'Broeder is geen lid van deze loge.' },
        { status: 404 }
      );
    }

    db.prepare('UPDATE users SET degree = ? WHERE id = ?').run(
      degree,
      body.userId
    );
    db.prepare(
      `UPDATE lodge_memberships
       SET role = ?, officer_title = ?, sort_order = ?
       WHERE user_id = ? AND lodge_id = ?`
    ).run(role, officerTitle, sortOrder, body.userId, lodgeId);

    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  }

  // Nieuwe broeder toevoegen (of bestaande broeder van zusterloge toevoegen als nevenlid)
  const email = (body.email || '').trim().toLowerCase();
  const fullName = (body.fullName || '').trim();
  const degree = Number(body.degree || 1) as Degree;
  const role: LodgeRole =
    body.role === 'secretary' || body.role === 'board' ? body.role : 'member';
  const officerTitle = (body.officerTitle || '').trim() || null;
  const sortOrder = officerTitle ? 10 : 100;
  const joinedYear = body.joinedYear || new Date().getFullYear();

  if (!email || !email.includes('@') || !fullName) {
    return NextResponse.json(
      { error: 'Vul minimaal de volledige naam en het e-mailadres in.' },
      { status: 400 }
    );
  }

  if (![1, 2, 3].includes(degree)) {
    return NextResponse.json({ error: 'Ongeldige graad.' }, { status: 400 });
  }

  const existingUser = db
    .prepare('SELECT id, degree FROM users WHERE lower(email) = ?')
    .get(email) as { id: string; degree: number } | undefined;

  let targetUserId: string;
  if (existingUser) {
    targetUserId = existingUser.id;
    if (degree > existingUser.degree) {
      db.prepare('UPDATE users SET degree = ? WHERE id = ?').run(
        degree,
        targetUserId
      );
    }
  } else {
    targetUserId = newId('usr');
    db.prepare(
      `INSERT INTO users (id, email, full_name, phone, city, degree, primary_lodge_id, dietary_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '', ?)`
    ).run(
      targetUserId,
      email,
      fullName.startsWith('Br.') ? fullName : `Br. ${fullName}`,
      (body.phone || '').trim(),
      (body.city || '').trim(),
      degree,
      lodgeId,
      new Date().toISOString()
    );
  }

  db.prepare(
    `INSERT OR REPLACE INTO lodge_memberships (user_id, lodge_id, role, officer_title, sort_order, joined_year)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(targetUserId, lodgeId, role, officerTitle, sortOrder, joinedYear);

  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, userId: targetUserId });
}

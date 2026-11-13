import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageLodge, getDb, newId } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    lodgeId?: string;
    title?: string;
    category?: string;
    body?: string;
    isPinned?: boolean;
  };

  const lodgeId = body.lodgeId || user.activeLodgeId;
  if (!canManageLodge(user, lodgeId)) {
    return NextResponse.json({ error: 'Geen beheerrechten.' }, { status: 403 });
  }

  const title = (body.title || '').trim();
  const messageBody = (body.body || '').trim();
  if (!title || !messageBody) {
    return NextResponse.json(
      { error: 'Vul een onderwerp en berichttekst in.' },
      { status: 400 }
    );
  }

  const membership = user.memberships.find((m) => m.lodgeId === lodgeId);
  const authorLabel = membership?.officerTitle
    ? `${user.fullName} (${membership.officerTitle})`
    : user.fullName;

  const db = getDb();
  db.prepare(
    `INSERT INTO announcements (id, lodge_id, title, category, author_name, body, is_pinned, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId('ann'),
    lodgeId,
    title,
    body.category || 'Secretariaat',
    authorLabel,
    messageBody,
    body.isPinned ? 1 : 0,
    new Date().toISOString()
  );

  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}

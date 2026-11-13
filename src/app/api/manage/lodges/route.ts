import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser, switchActiveLodge } from '@/lib/auth';
import { canManageLodge, getDb, validateImageDataUrl } from '@/lib/db';

export const runtime = 'nodejs';

function slugifyLodge(name: string, number: number): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `loge-${number}-${clean || 'werkplaats'}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: 'create' | 'update';
    lodgeId?: string;
    number?: number;
    name?: string;
    city?: string;
    meetingDay?: string;
    address?: string;
    accentColor?: string;
    logoUrl?: string;
    description?: string;
  };

  const db = getDb();

  // Bestaande loge bijwerken (bijv. Loge-foto / wapen uploaden of kleur aanpassen)
  if (body.action === 'update') {
    const targetLodgeId = body.lodgeId || user.activeLodgeId;
    if (!canManageLodge(user, targetLodgeId)) {
      return NextResponse.json(
        { error: 'Alleen de Secretaris of het Bestuur kan deze loge aanpassen.' },
        { status: 403 }
      );
    }

    const existing = db
      .prepare('SELECT logo_url, accent_color FROM lodges WHERE id = ?')
      .get(targetLodgeId) as
      | { logo_url: string; accent_color: string }
      | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: 'Loge niet gevonden.' },
        { status: 404 }
      );
    }

    let nextLogoUrl = existing.logo_url || '';
    if (body.logoUrl !== undefined) {
      const check = validateImageDataUrl(body.logoUrl);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      nextLogoUrl = check.value;
    }

    const nextColor = (body.accentColor || existing.accent_color || '#1B365D').trim();

    db.prepare(
      'UPDATE lodges SET logo_url = ?, accent_color = ? WHERE id = ?'
    ).run(nextLogoUrl, nextColor, targetLodgeId);

    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true, lodgeId: targetLodgeId });
  }

  // Nieuwe loge aanmaken op het platform
  if (!canManageLodge(user, user.activeLodgeId)) {
    return NextResponse.json(
      { error: 'Alleen een Secretaris of Beheerder kan een nieuwe loge aansluiten.' },
      { status: 403 }
    );
  }

  const number = Number(body.number || 0);
  const name = (body.name || '').trim();
  const city = (body.city || '').trim();
  const meetingDay = (body.meetingDay || '').trim();
  const address = (body.address || '').trim();
  const accentColor = (body.accentColor || '#1B365D').trim();

  if (!number || !name || !city || !address) {
    return NextResponse.json(
      { error: 'Vul het logenummer, de naam, het Oosten (stad) en het adres in.' },
      { status: 400 }
    );
  }

  const logoCheck = validateImageDataUrl(body.logoUrl);
  if (!logoCheck.ok) {
    return NextResponse.json({ error: logoCheck.error }, { status: 400 });
  }

  const lodgeId = slugifyLodge(name, number);

  const exists = db
    .prepare('SELECT id FROM lodges WHERE id = ?')
    .get(lodgeId) as { id: string } | undefined;
  if (exists) {
    return NextResponse.json(
      { error: 'Deze loge bestaat al op het platform.' },
      { status: 400 }
    );
  }

  db.prepare(
    `INSERT INTO lodges (id, number, name, city, meeting_day, address, accent_color, logo_url, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    lodgeId,
    number,
    name,
    city,
    meetingDay || 'Wekelijkse arbeid (20:00 uur)',
    address,
    accentColor,
    logoCheck.value,
    (body.description || '').trim()
  );

  // Maak de aanmaker direct Secretaris van deze nieuwe loge en schakel ernaartoe!
  db.prepare(
    `INSERT INTO lodge_memberships (user_id, lodge_id, role, officer_title, sort_order, joined_year)
     VALUES (?, ?, 'secretary', 'Secretaris', 4, ?)`
  ).run(user.id, lodgeId, new Date().getFullYear());

  await switchActiveLodge(lodgeId);
  revalidatePath('/', 'layout');

  return NextResponse.json({ ok: true, lodgeId });
}

import { NextResponse } from 'next/server';
import { getCurrentUser, switchActiveLodge } from '@/lib/auth';
import { canManageLodge, getDb } from '@/lib/db';

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

  if (!canManageLodge(user, user.activeLodgeId)) {
    return NextResponse.json(
      { error: 'Alleen een Secretaris of Beheerder kan een nieuwe loge aansluiten.' },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    number?: number;
    name?: string;
    city?: string;
    meetingDay?: string;
    address?: string;
    accentColor?: string;
    description?: string;
  };

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

  const db = getDb();
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
    `INSERT INTO lodges (id, number, name, city, meeting_day, address, accent_color, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    lodgeId,
    number,
    name,
    city,
    meetingDay || 'Wekelijkse arbeid (20:00 uur)',
    address,
    accentColor,
    (body.description || '').trim()
  );

  // Maak de aanmaker direct Secretaris van deze nieuwe loge en schakel ernaartoe!
  db.prepare(
    `INSERT INTO lodge_memberships (user_id, lodge_id, role, officer_title, sort_order, joined_year)
     VALUES (?, ?, 'secretary', 'Secretaris', 4, ?)`
  ).run(user.id, lodgeId, new Date().getFullYear());

  await switchActiveLodge(lodgeId);

  return NextResponse.json({ ok: true, lodgeId });
}

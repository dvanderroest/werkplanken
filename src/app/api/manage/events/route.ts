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
    eventType?: string;
    minDegree?: number;
    eventDate?: string;
    startTime?: string;
    doorsOpenTime?: string;
    location?: string;
    speaker?: string;
    hasMeal?: boolean;
    mealInfo?: string;
    allowVisitors?: boolean;
    werkplankText?: string;
  };

  const lodgeId = body.lodgeId || user.activeLodgeId;
  if (!canManageLodge(user, lodgeId)) {
    return NextResponse.json(
      { error: 'Alleen de Secretaris of het Bestuur kan werkplanken toevoegen.' },
      { status: 403 }
    );
  }

  const title = (body.title || '').trim();
  const eventDate = (body.eventDate || '').trim();
  const startTime = (body.startTime || '20:00').trim();
  const location = (body.location || '').trim();
  const werkplankText = (body.werkplankText || '').trim();
  const minDegree = Number(body.minDegree || 1);

  if (!title || !eventDate || !location || !werkplankText) {
    return NextResponse.json(
      { error: 'Vul titel, datum, locatie en de tekst van de werkplank in.' },
      { status: 400 }
    );
  }

  if (![1, 2, 3].includes(minDegree)) {
    return NextResponse.json({ error: 'Ongeldige graad.' }, { status: 400 });
  }

  const db = getDb();
  const eventId = newId('evt');
  db.prepare(
    `INSERT INTO events (
      id, lodge_id, title, event_type, min_degree, event_date, start_time, doors_open_time,
      location, speaker, has_meal, meal_info, allow_visitors, werkplank_text, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    eventId,
    lodgeId,
    title,
    body.eventType || 'Comparitie',
    minDegree,
    eventDate,
    startTime,
    (body.doorsOpenTime || '19:30').trim(),
    location,
    (body.speaker || '').trim(),
    body.hasMeal === false ? 0 : 1,
    (body.mealInfo || '').trim(),
    body.allowVisitors === false ? 0 : 1,
    werkplankText,
    new Date().toISOString()
  );

  return NextResponse.json({ ok: true, eventId });
}

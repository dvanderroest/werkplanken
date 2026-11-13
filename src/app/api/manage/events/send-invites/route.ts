import { NextResponse } from 'next/server';
import { createRsvpEmailToken, getCurrentUser } from '@/lib/auth';
import { canManageLodge, getDb } from '@/lib/db';
import { formatDutchDate } from '@/lib/format';
import { buildWerkplankInviteEmail, sendMail } from '@/lib/mailer';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const body = (await request.json()) as { eventId?: string };
  if (!body.eventId) {
    return NextResponse.json(
      { error: 'Geen bijeenkomst opgegeven.' },
      { status: 400 }
    );
  }

  const db = getDb();
  const event = db
    .prepare(
      `SELECT e.*, l.name as lodge_name, l.number as lodge_number
       FROM events e
       JOIN lodges l ON l.id = e.lodge_id
       WHERE e.id = ?`
    )
    .get(body.eventId) as
    | {
        id: string;
        lodge_id: string;
        lodge_name: string;
        lodge_number: number;
        title: string;
        min_degree: number;
        event_date: string;
        start_time: string;
        location: string;
        has_meal: number;
        meal_info: string;
        werkplank_text: string;
      }
    | undefined;

  if (!event) {
    return NextResponse.json(
      { error: 'Bijeenkomst niet gevonden.' },
      { status: 404 }
    );
  }

  if (!canManageLodge(user, event.lodge_id)) {
    return NextResponse.json({ error: 'Geen beheerrechten.' }, { status: 403 });
  }

  // Selecteer alleen leden van de eigen loge met minimaal de vereiste graad!
  const recipients = db
    .prepare(
      `SELECT u.id, u.email, u.full_name
       FROM lodge_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.lodge_id = ? AND u.degree >= ?
       ORDER BY u.full_name ASC`
    )
    .all(event.lodge_id, event.min_degree) as Array<{
    id: string;
    email: string;
    full_name: string;
  }>;

  const url = new URL(request.url);
  const origin =
    process.env.PUBLIC_APP_URL?.replace(/\/$/, '') || url.origin;
  const formattedDate = formatDutchDate(event.event_date);

  let sentCount = 0;
  for (const recipient of recipients) {
    const token = createRsvpEmailToken(event.id, recipient.id);
    const attendWithMealUrl = `${origin}/aanmelden/klik?token=${token}&keuze=maal`;
    const attendNoMealUrl = `${origin}/aanmelden/klik?token=${token}&keuze=aanwezig`;
    const declineUrl = `${origin}/aanmelden/klik?token=${token}&keuze=verhinderd`;

    const mail = buildWerkplankInviteEmail({
      fullName: recipient.full_name,
      lodgeName: event.lodge_name,
      lodgeNumber: event.lodge_number,
      eventTitle: event.title,
      eventDateFormatted: formattedDate,
      startTime: event.start_time,
      location: event.location,
      hasMeal: event.has_meal === 1,
      mealInfo: event.meal_info,
      werkplankExcerpt: event.werkplank_text,
      attendWithMealUrl,
      attendNoMealUrl,
      declineUrl,
    });

    await sendMail({
      toEmail: recipient.email,
      toName: recipient.full_name,
      subject: mail.subject,
      htmlBody: mail.htmlBody,
      textBody: mail.textBody,
      previewLink: event.has_meal === 1 ? attendWithMealUrl : attendNoMealUrl,
    });
    sentCount += 1;
  }

  return NextResponse.json({ ok: true, sentCount });
}

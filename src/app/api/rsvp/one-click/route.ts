import { NextResponse } from 'next/server';
import { createSessionForUser } from '@/lib/auth';
import { getDb, getUserMemberships, saveUserRsvp } from '@/lib/db';
import type { AuthenticatedUser, Degree, RsvpStatus } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    token?: string;
    status?: RsvpStatus;
    joinsMeal?: boolean;
  };

  if (
    !body.token ||
    (body.status !== 'attending' && body.status !== 'declined')
  ) {
    return NextResponse.json(
      { error: 'Ongeldige aanmeldlink.' },
      { status: 400 }
    );
  }

  const db = getDb();
  const now = Date.now();

  const tokenRow = db
    .prepare(
      `SELECT token, event_id, user_id, expires_at
       FROM rsvp_tokens WHERE token = ?`
    )
    .get(body.token.trim()) as
    | { token: string; event_id: string; user_id: string; expires_at: number }
    | undefined;

  if (!tokenRow || tokenRow.expires_at <= now) {
    return NextResponse.json(
      { error: 'Deze aanmeldlink is verlopen. Log in om uw keuze door te geven.' },
      { status: 400 }
    );
  }

  const userRow = db
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.phone, u.city, u.degree, u.primary_lodge_id, u.dietary_default,
              pl.name as primary_lodge_name, pl.number as primary_lodge_number, pl.city as primary_lodge_city,
              e.lodge_id as event_lodge_id, e.title as event_title
       FROM users u
       JOIN lodges pl ON pl.id = u.primary_lodge_id
       JOIN events e ON e.id = ?
       WHERE u.id = ?`
    )
    .get(tokenRow.event_id, tokenRow.user_id) as
    | {
        id: string;
        email: string;
        full_name: string;
        phone: string;
        city: string;
        degree: Degree;
        primary_lodge_id: string;
        dietary_default: string;
        primary_lodge_name: string;
        primary_lodge_number: number;
        primary_lodge_city: string;
        event_lodge_id: string;
        event_title: string;
      }
    | undefined;

  if (!userRow) {
    return NextResponse.json(
      { error: 'Bijeenkomst of lid niet gevonden.' },
      { status: 404 }
    );
  }

  const memberships = getUserMemberships(userRow.id);
  const authUser: AuthenticatedUser = {
    id: userRow.id,
    email: userRow.email,
    fullName: userRow.full_name,
    phone: userRow.phone,
    city: userRow.city,
    degree: userRow.degree,
    primaryLodgeId: userRow.primary_lodge_id,
    primaryLodgeName: userRow.primary_lodge_name,
    primaryLodgeNumber: userRow.primary_lodge_number,
    primaryLodgeCity: userRow.primary_lodge_city,
    dietaryDefault: userRow.dietary_default,
    activeLodgeId: userRow.event_lodge_id,
    memberships,
  };

  const result = saveUserRsvp({
    user: authUser,
    eventId: tokenRow.event_id,
    status: body.status,
    joinsMeal: Boolean(body.joinsMeal),
    dietaryNote: userRow.dietary_default,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  // Log de broeder ook direct in op dit apparaat voor zijn gemak
  await createSessionForUser(userRow.id, userRow.event_lodge_id, true);

  return NextResponse.json({
    ok: true,
    fullName: userRow.full_name,
    eventTitle: userRow.event_title,
  });
}

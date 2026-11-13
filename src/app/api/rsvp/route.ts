import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveUserRsvp } from '@/lib/db';
import type { RsvpStatus } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Uw sessie is verlopen. Log even opnieuw in.' },
      { status: 401 }
    );
  }

  const body = (await request.json()) as {
    eventId?: string;
    status?: RsvpStatus;
    joinsMeal?: boolean;
    dietaryNote?: string;
    comment?: string;
  };

  if (
    !body.eventId ||
    (body.status !== 'attending' && body.status !== 'declined')
  ) {
    return NextResponse.json(
      { error: 'Ongeldige aanmelding.' },
      { status: 400 }
    );
  }

  const result = saveUserRsvp({
    user,
    eventId: body.eventId,
    status: body.status,
    joinsMeal: Boolean(body.joinsMeal),
    dietaryNote: body.dietaryNote,
    comment: body.comment,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json(result);
}

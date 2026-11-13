import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getEventRsvpsForManagement } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const { eventId } = await context.params;
  const rsvps = getEventRsvpsForManagement(user, eventId);
  return NextResponse.json({ rsvps });
}

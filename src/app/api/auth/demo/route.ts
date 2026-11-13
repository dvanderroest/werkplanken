import { NextResponse } from 'next/server';
import { createSessionForUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { isDevMailboxEnabled } from '@/lib/mailer';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isDevMailboxEnabled()) {
    return NextResponse.json(
      { error: 'Demo-snelkoppelingen staan uit in productie.' },
      { status: 403 }
    );
  }

  const body = (await request.json()) as { email?: string };
  const email = (body.email || '').trim().toLowerCase();

  const db = getDb();
  const user = db
    .prepare('SELECT id, primary_lodge_id FROM users WHERE lower(email) = ?')
    .get(email) as { id: string; primary_lodge_id: string } | undefined;

  if (!user) {
    return NextResponse.json(
      { error: 'Voorbeeldaccount niet gevonden.' },
      { status: 404 }
    );
  }

  await createSessionForUser(user.id, user.primary_lodge_id, true);
  return NextResponse.json({ ok: true });
}

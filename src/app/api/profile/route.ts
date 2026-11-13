import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    phone?: string;
    city?: string;
    dietaryDefault?: string;
  };

  const db = getDb();
  db.prepare(
    `UPDATE users SET phone = ?, city = ?, dietary_default = ? WHERE id = ?`
  ).run(
    (body.phone ?? user.phone).trim(),
    (body.city ?? user.city).trim(),
    (body.dietaryDefault ?? user.dietaryDefault).trim(),
    user.id
  );

  return NextResponse.json({ ok: true });
}

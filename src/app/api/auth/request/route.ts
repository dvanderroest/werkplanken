import { NextResponse } from 'next/server';
import { requestLoginChallenge } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const url = new URL(request.url);
    const origin =
      process.env.PUBLIC_APP_URL?.replace(/\/$/, '') || url.origin;

    const result = await requestLoginChallenge({
      email: body.email || '',
      origin,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Auth request error:', err);
    return NextResponse.json(
      { error: 'Er ging iets mis bij het versturen van de inlogcode.' },
      { status: 500 }
    );
  }
}

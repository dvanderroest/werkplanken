import { NextResponse } from 'next/server';
import { switchActiveLodge } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json()) as { lodgeId?: string };
  if (!body.lodgeId) {
    return NextResponse.json({ error: 'Geen loge opgegeven.' }, { status: 400 });
  }

  const switched = await switchActiveLodge(body.lodgeId);
  if (!switched) {
    return NextResponse.json(
      { error: 'U bent geen lid van deze loge.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { verifyCodeAndLogin, verifyMagicTokenAndLogin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
      keepSignedIn?: boolean;
      magicToken?: string;
    };

    if (body.magicToken) {
      const result = await verifyMagicTokenAndLogin(body.magicToken);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    const result = await verifyCodeAndLogin({
      email: body.email || '',
      code: body.code || '',
      keepSignedIn: body.keepSignedIn !== false,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Auth verify error:', err);
    return NextResponse.json(
      { error: 'Controle van de code is mislukt. Probeer het opnieuw.' },
      { status: 500 }
    );
  }
}

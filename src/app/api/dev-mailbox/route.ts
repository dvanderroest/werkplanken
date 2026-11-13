import { NextResponse } from 'next/server';
import { getRecentOutboxEmails } from '@/lib/db';
import { isDevMailboxEnabled } from '@/lib/mailer';

export const runtime = 'nodejs';

export async function GET() {
  if (!isDevMailboxEnabled()) {
    return NextResponse.json({ enabled: false, emails: [] });
  }

  return NextResponse.json({
    enabled: true,
    emails: getRecentOutboxEmails(20),
  });
}

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb, getUserMemberships, newId } from './db';
import { buildLoginEmail, sendMail } from './mailer';
import type { AuthenticatedUser, Degree } from './types';

export const SESSION_COOKIE_NAME = 'werkplank_sessie';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const ONE_YEAR_MS = ONE_YEAR_SECONDS * 1000;
const CHALLENGE_TTL_MS = 30 * 60 * 1000; // 30 minuten

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateSixDigitCode(): string {
  const n = crypto.randomInt(100000, 1000000);
  return String(n);
}

export async function requestLoginChallenge(params: {
  email: string;
  origin: string;
}): Promise<
  | {
      ok: true;
      deliveryMode: 'dev_mailbox' | 'smtp';
      devCode?: string;
      devMagicUrl?: string;
    }
  | { ok: false; error: string }
> {
  const normalizedEmail = params.email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      ok: false,
      error: 'Vul alstublieft een geldig e-mailadres in.',
    };
  }

  const db = getDb();
  const user = db
    .prepare('SELECT id, email, full_name FROM users WHERE lower(email) = ?')
    .get(normalizedEmail) as
    | { id: string; email: string; full_name: string }
    | undefined;

  if (!user) {
    return {
      ok: false,
      error:
        'Dit e-mailadres is nog niet bekend. Alleen leden die door de Secretaris van hun loge zijn toegevoegd kunnen inloggen. Neem bij twijfel even contact op met uw Secretaris.',
    };
  }

  const code = generateSixDigitCode();
  const magicToken = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const expiresAt = now + CHALLENGE_TTL_MS;

  db.prepare(
    `INSERT INTO auth_challenges (id, email, code, magic_token, expires_at, used_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`
  ).run(newId('chal'), user.email, code, magicToken, expiresAt, now);

  const magicUrl = `${params.origin}/inloggen/bevestig?token=${magicToken}`;
  const mailContent = buildLoginEmail({
    fullName: user.full_name,
    code,
    magicUrl,
  });

  const delivery = await sendMail({
    toEmail: user.email,
    toName: user.full_name,
    subject: mailContent.subject,
    htmlBody: mailContent.htmlBody,
    textBody: mailContent.textBody,
    previewCode: code,
    previewLink: magicUrl,
  });

  return {
    ok: true,
    deliveryMode: delivery.mode,
    devCode: delivery.mode === 'dev_mailbox' ? code : undefined,
    devMagicUrl: delivery.mode === 'dev_mailbox' ? magicUrl : undefined,
  };
}

export async function verifyCodeAndLogin(params: {
  email: string;
  code: string;
  keepSignedIn?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const cleanCode = params.code.replace(/\D/g, '');

  if (cleanCode.length !== 6) {
    return {
      ok: false,
      error: 'Vul de 6 cijfers uit de e-mail in.',
    };
  }

  const db = getDb();
  const now = Date.now();

  const challenge = db
    .prepare(
      `SELECT id, email FROM auth_challenges
       WHERE lower(email) = ? AND code = ? AND used_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(normalizedEmail, cleanCode, now) as
    | { id: string; email: string }
    | undefined;

  if (!challenge) {
    return {
      ok: false,
      error:
        'Deze 6-cijferige code klopt niet of is verlopen (langer dan 30 minuten geleden). Vraag gerust een nieuwe code aan.',
    };
  }

  const user = db
    .prepare('SELECT id, primary_lodge_id FROM users WHERE lower(email) = ?')
    .get(normalizedEmail) as
    | { id: string; primary_lodge_id: string }
    | undefined;

  if (!user) {
    return { ok: false, error: 'Account niet gevonden.' };
  }

  db.prepare('UPDATE auth_challenges SET used_at = ? WHERE id = ?').run(
    now,
    challenge.id
  );

  await createSessionForUser(
    user.id,
    user.primary_lodge_id,
    params.keepSignedIn !== false
  );
  return { ok: true };
}

export async function verifyMagicTokenAndLogin(
  magicToken: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleanToken = magicToken.trim();
  if (!cleanToken) {
    return { ok: false, error: 'Ongeldige inloglink.' };
  }

  const db = getDb();
  const now = Date.now();

  const challenge = db
    .prepare(
      `SELECT id, email, used_at, expires_at FROM auth_challenges
       WHERE magic_token = ? LIMIT 1`
    )
    .get(cleanToken) as
    | { id: string; email: string; used_at: number | null; expires_at: number }
    | undefined;

  if (!challenge || challenge.expires_at <= now) {
    return {
      ok: false,
      error:
        'Deze inloglink is verlopen (langer dan 30 minuten oud). Vraag op het inlogscherm eenvoudig een nieuwe aan.',
    };
  }

  // Korte coulance van 2 minuten voor als iemand op zijn telefoon per ongeluk dubbel tikt op dezelfde link
  if (challenge.used_at && now - challenge.used_at > 2 * 60 * 1000) {
    return {
      ok: false,
      error:
        'Deze inloglink is al eerder gebruikt. Bent u nog niet ingelogd? Vraag dan even een nieuwe code aan.',
    };
  }

  const user = db
    .prepare('SELECT id, primary_lodge_id FROM users WHERE lower(email) = ?')
    .get(challenge.email.toLowerCase()) as
    | { id: string; primary_lodge_id: string }
    | undefined;

  if (!user) {
    return { ok: false, error: 'Gebruiker niet gevonden.' };
  }

  if (!challenge.used_at) {
    db.prepare('UPDATE auth_challenges SET used_at = ? WHERE id = ?').run(
      now,
      challenge.id
    );
  }

  await createSessionForUser(user.id, user.primary_lodge_id, true);
  return { ok: true };
}

export async function createSessionForUser(
  userId: string,
  preferredLodgeId: string,
  keepSignedIn = true
): Promise<void> {
  const db = getDb();
  const memberships = getUserMemberships(userId);
  const activeLodgeId =
    memberships.find((m) => m.lodgeId === preferredLodgeId)?.lodgeId ||
    memberships[0]?.lodgeId ||
    preferredLodgeId;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(rawToken);
  const now = Date.now();
  const durationMs = keepSignedIn ? ONE_YEAR_MS : 12 * 60 * 60 * 1000;

  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, active_lodge_id, expires_at, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(tokenHash, userId, activeLodgeId, now + durationMs, now, now);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
    path: '/',
    maxAge: keepSignedIn ? ONE_YEAR_SECONDS : 12 * 60 * 60,
  });
}

export async function switchActiveLodge(lodgeId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return false;

  const tokenHash = sha256(rawToken);
  const db = getDb();
  const session = db
    .prepare('SELECT user_id FROM sessions WHERE token_hash = ?')
    .get(tokenHash) as { user_id: string } | undefined;

  if (!session) return false;

  const memberships = getUserMemberships(session.user_id);
  if (!memberships.some((m) => m.lodgeId === lodgeId)) {
    return false;
  }

  db.prepare('UPDATE sessions SET active_lodge_id = ? WHERE token_hash = ?').run(
    lodgeId,
    tokenHash
  );
  return true;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(
      sha256(rawToken)
    );
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = sha256(rawToken);
  const db = getDb();
  const now = Date.now();

  const row = db
    .prepare(
      `SELECT s.user_id, s.active_lodge_id, s.expires_at,
              u.email, u.full_name, u.phone, u.city, u.degree, u.primary_lodge_id, u.dietary_default,
              pl.name as primary_lodge_name, pl.number as primary_lodge_number, pl.city as primary_lodge_city
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN lodges pl ON pl.id = u.primary_lodge_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(tokenHash, now) as
    | {
        user_id: string;
        active_lodge_id: string;
        expires_at: number;
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
      }
    | undefined;

  if (!row) return null;

  // Stilzwijgende verlenging van de sessie in de database bij elk gebruik
  db.prepare(
    'UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?'
  ).run(now, Math.max(row.expires_at, now + ONE_YEAR_MS), tokenHash);

  const memberships = getUserMemberships(row.user_id);
  const validActiveLodgeId =
    memberships.find((m) => m.lodgeId === row.active_lodge_id)?.lodgeId ||
    memberships[0]?.lodgeId ||
    row.primary_lodge_id;

  return {
    id: row.user_id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    city: row.city,
    degree: row.degree,
    primaryLodgeId: row.primary_lodge_id,
    primaryLodgeName: row.primary_lodge_name,
    primaryLodgeNumber: row.primary_lodge_number,
    primaryLodgeCity: row.primary_lodge_city,
    dietaryDefault: row.dietary_default,
    activeLodgeId: validActiveLodgeId,
    memberships,
  };
}

export function createRsvpEmailToken(eventId: string, userId: string): string {
  const db = getDb();
  const token = crypto.randomBytes(20).toString('hex');
  const expiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000; // 60 dagen geldig
  db.prepare(
    `INSERT INTO rsvp_tokens (token, event_id, user_id, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(token, eventId, userId, expiresAt);
  return token;
}

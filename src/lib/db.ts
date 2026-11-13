import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { seedDatabaseIfEmpty } from './seed';
import type {
  AnnouncementCategory,
  AuthenticatedUser,
  Degree,
  DocumentCategory,
  EventRsvpDetail,
  EventType,
  Lodge,
  LodgeAnnouncement,
  LodgeDocument,
  LodgeEvent,
  LodgeMemberView,
  LodgeRole,
  OutboxEmail,
  RsvpStatus,
  UserMembership,
} from './types';

const SCHEMA_VERSION = 2;

declare global {
  // eslint-disable-next-line no-var
  var __werkplankenDb: DatabaseSync | undefined;
  // eslint-disable-next-line no-var
  var __werkplankenSchemaVersion: number | undefined;
}

export function getDb(): DatabaseSync {
  if (globalThis.__werkplankenDb) {
    if (globalThis.__werkplankenSchemaVersion !== SCHEMA_VERSION) {
      ensureSchemaUpgrades(globalThis.__werkplankenDb);
      globalThis.__werkplankenSchemaVersion = SCHEMA_VERSION;
    }
    return globalThis.__werkplankenDb;
  }

  const dbFilePath =
    process.env.DATABASE_PATH ||
    path.join(process.cwd(), 'data', 'werkplanken.sqlite');

  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbFilePath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  initializeSchema(db);
  ensureSchemaUpgrades(db);
  seedDatabaseIfEmpty(db);

  globalThis.__werkplankenDb = db;
  globalThis.__werkplankenSchemaVersion = SCHEMA_VERSION;
  return db;
}

function ensureColumnExists(
  db: DatabaseSync,
  tableName: string,
  columnName: string,
  columnDefinition: string
): void {
  const cols = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === columnName)) {
    db.exec(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`
    );
  }
}

function ensureSchemaUpgrades(db: DatabaseSync): void {
  ensureColumnExists(db, 'lodges', 'logo_url', "TEXT NOT NULL DEFAULT ''");
  ensureColumnExists(db, 'users', 'avatar_url', "TEXT NOT NULL DEFAULT ''");
}

export function validateImageDataUrl(input: unknown):
  | { ok: true; value: string }
  | { ok: false; error: string } {
  if (input === undefined || input === null || input === '') {
    return { ok: true, value: '' };
  }
  if (typeof input !== 'string') {
    return { ok: false, error: 'Ongeldig afbeeldingsformaat.' };
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: true, value: '' };
  }
  if (trimmed.length > 500_000) {
    return {
      ok: false,
      error: 'De afbeelding is te groot. Kies een kleinere foto.',
    };
  }
  if (!/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return {
      ok: false,
      error: 'Alleen JPG, PNG, WebP of GIF afbeeldingen worden ondersteund.',
    };
  }
  return { ok: true, value: trimmed };
}

function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lodges (
      id TEXT PRIMARY KEY,
      number INTEGER NOT NULL,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      meeting_day TEXT NOT NULL,
      address TEXT NOT NULL,
      accent_color TEXT NOT NULL DEFAULT '#1B365D',
      logo_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      degree INTEGER NOT NULL CHECK(degree IN (1, 2, 3)),
      primary_lodge_id TEXT NOT NULL REFERENCES lodges(id),
      dietary_default TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lodge_memberships (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lodge_id TEXT NOT NULL REFERENCES lodges(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('member', 'board', 'secretary')),
      officer_title TEXT,
      sort_order INTEGER NOT NULL DEFAULT 100,
      joined_year INTEGER,
      PRIMARY KEY (user_id, lodge_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      lodge_id TEXT NOT NULL REFERENCES lodges(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      event_type TEXT NOT NULL,
      min_degree INTEGER NOT NULL CHECK(min_degree IN (1, 2, 3)),
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      doors_open_time TEXT NOT NULL DEFAULT '19:30',
      location TEXT NOT NULL,
      speaker TEXT NOT NULL DEFAULT '',
      has_meal INTEGER NOT NULL DEFAULT 1,
      meal_info TEXT NOT NULL DEFAULT '',
      allow_visitors INTEGER NOT NULL DEFAULT 1,
      werkplank_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rsvps (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('attending', 'declined')),
      joins_meal INTEGER NOT NULL DEFAULT 0,
      is_visitor INTEGER NOT NULL DEFAULT 0,
      dietary_note TEXT NOT NULL DEFAULT '',
      comment TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE (event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      lodge_id TEXT NOT NULL REFERENCES lodges(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      min_degree INTEGER NOT NULL CHECK(min_degree IN (1, 2, 3)),
      published_date TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      lodge_id TEXT NOT NULL REFERENCES lodges(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_challenges (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      magic_token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      active_lodge_id TEXT NOT NULL REFERENCES lodges(id),
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rsvp_tokens (
      token TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_outbox (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      to_name TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL,
      html_body TEXT NOT NULL,
      text_body TEXT NOT NULL,
      preview_code TEXT,
      preview_link TEXT,
      delivery_mode TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

export function isMemberOfLodge(user: AuthenticatedUser, lodgeId: string): boolean {
  return user.memberships.some((m) => m.lodgeId === lodgeId);
}

export function canManageLodge(user: AuthenticatedUser, lodgeId: string): boolean {
  return user.memberships.some(
    (m) => m.lodgeId === lodgeId && (m.role === 'secretary' || m.role === 'board')
  );
}

export function getLodgeById(lodgeId: string): Lodge | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, number, name, city, meeting_day, address, accent_color, logo_url, description
       FROM lodges WHERE id = ?`
    )
    .get(lodgeId) as
    | {
        id: string;
        number: number;
        name: string;
        city: string;
        meeting_day: string;
        address: string;
        accent_color: string;
        logo_url: string;
        description: string;
      }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    city: row.city,
    meetingDay: row.meeting_day,
    address: row.address,
    accentColor: row.accent_color,
    logoUrl: row.logo_url || '',
    description: row.description,
  };
}

export function getAllLodges(): Lodge[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, number, name, city, meeting_day, address, accent_color, logo_url, description
       FROM lodges ORDER BY number ASC`
    )
    .all() as Array<{
    id: string;
    number: number;
    name: string;
    city: string;
    meeting_day: string;
    address: string;
    accent_color: string;
    logo_url: string;
    description: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    name: row.name,
    city: row.city,
    meetingDay: row.meeting_day,
    address: row.address,
    accentColor: row.accent_color,
    logoUrl: row.logo_url || '',
    description: row.description,
  }));
}

export function getUserMemberships(userId: string): UserMembership[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT m.lodge_id, m.role, m.officer_title, m.joined_year,
              l.name as lodge_name, l.number as lodge_number, l.city as lodge_city,
              l.accent_color, l.logo_url
       FROM lodge_memberships m
       JOIN lodges l ON l.id = m.lodge_id
       WHERE m.user_id = ?
       ORDER BY l.number ASC`
    )
    .all(userId) as Array<{
    lodge_id: string;
    role: LodgeRole;
    officer_title: string | null;
    joined_year: number | null;
    lodge_name: string;
    lodge_number: number;
    lodge_city: string;
    accent_color: string;
    logo_url: string;
  }>;

  return rows.map((r) => ({
    lodgeId: r.lodge_id,
    lodgeName: r.lodge_name,
    lodgeNumber: r.lodge_number,
    lodgeCity: r.lodge_city,
    lodgeAccentColor: r.accent_color,
    lodgeLogoUrl: r.logo_url || '',
    role: r.role,
    officerTitle: r.officer_title,
    joinedYear: r.joined_year,
  }));
}

export function getOwnLodgeEvents(
  user: AuthenticatedUser,
  lodgeId: string
): LodgeEvent[] {
  if (!isMemberOfLodge(user, lodgeId)) {
    return [];
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT e.*,
              l.name as lodge_name, l.number as lodge_number, l.city as lodge_city,
              l.accent_color, l.logo_url as lodge_logo_url,
              r.status as my_status, r.joins_meal as my_meal, r.is_visitor as my_visitor,
              r.dietary_note as my_diet, r.comment as my_comment,
              (SELECT COUNT(*) FROM rsvps r2 WHERE r2.event_id = e.id AND r2.status = 'attending' AND r2.is_visitor = 0) as attending_members,
              (SELECT COUNT(*) FROM rsvps r2 WHERE r2.event_id = e.id AND r2.status = 'attending' AND r2.is_visitor = 1) as attending_visitors,
              (SELECT COUNT(*) FROM rsvps r2 WHERE r2.event_id = e.id AND r2.status = 'declined' AND r2.is_visitor = 0) as declined_members,
              (SELECT COUNT(*) FROM rsvps r2 WHERE r2.event_id = e.id AND r2.status = 'attending' AND r2.joins_meal = 1) as meal_count
       FROM events e
       JOIN lodges l ON l.id = e.lodge_id
       LEFT JOIN rsvps r ON r.event_id = e.id AND r.user_id = ?
       WHERE e.lodge_id = ? AND e.min_degree <= ?
       ORDER BY e.event_date ASC, e.start_time ASC`
    )
    .all(user.id, lodgeId, user.degree) as Array<Record<string, unknown>>;

  return rows.map(mapEventRow);
}

export function getVisitorEvents(
  user: AuthenticatedUser,
  activeLodgeId: string
): LodgeEvent[] {
  const db = getDb();
  const todayIso = new Date().toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `SELECT e.*,
              l.name as lodge_name, l.number as lodge_number, l.city as lodge_city,
              l.accent_color, l.logo_url as lodge_logo_url,
              r.status as my_status, r.joins_meal as my_meal, r.is_visitor as my_visitor,
              r.dietary_note as my_diet, r.comment as my_comment,
              0 as attending_members, 0 as attending_visitors, 0 as declined_members, 0 as meal_count
       FROM events e
       JOIN lodges l ON l.id = e.lodge_id
       LEFT JOIN rsvps r ON r.event_id = e.id AND r.user_id = ?
       WHERE e.lodge_id != ?
         AND e.allow_visitors = 1
         AND e.min_degree <= ?
         AND e.event_date >= ?
       ORDER BY e.event_date ASC, e.start_time ASC`
    )
    .all(user.id, activeLodgeId, user.degree, todayIso) as Array<
    Record<string, unknown>
  >;

  return rows.map((row) => {
    const mapped = mapEventRow(row);
    delete mapped.stats;
    return mapped;
  });
}

function mapEventRow(row: Record<string, unknown>): LodgeEvent {
  return {
    id: String(row.id),
    lodgeId: String(row.lodge_id),
    lodgeName: String(row.lodge_name),
    lodgeNumber: Number(row.lodge_number),
    lodgeCity: String(row.lodge_city),
    lodgeAccentColor: String(row.accent_color),
    lodgeLogoUrl: String(row.lodge_logo_url || ''),
    title: String(row.title),
    eventType: String(row.event_type) as EventType,
    minDegree: Number(row.min_degree) as Degree,
    eventDate: String(row.event_date),
    startTime: String(row.start_time),
    doorsOpenTime: String(row.doors_open_time),
    location: String(row.location),
    speaker: String(row.speaker || ''),
    hasMeal: Number(row.has_meal) === 1,
    mealInfo: String(row.meal_info || ''),
    allowVisitors: Number(row.allow_visitors) === 1,
    werkplankText: String(row.werkplank_text),
    myRsvp: row.my_status
      ? {
          status: String(row.my_status) as RsvpStatus,
          joinsMeal: Number(row.my_meal) === 1,
          isVisitor: Number(row.my_visitor) === 1,
          dietaryNote: String(row.my_diet || ''),
          comment: String(row.my_comment || ''),
        }
      : null,
    stats: {
      attendingMembers: Number(row.attending_members || 0),
      attendingVisitors: Number(row.attending_visitors || 0),
      declinedMembers: Number(row.declined_members || 0),
      mealCount: Number(row.meal_count || 0),
    },
  };
}

export function saveUserRsvp(params: {
  user: AuthenticatedUser;
  eventId: string;
  status: RsvpStatus;
  joinsMeal: boolean;
  dietaryNote?: string;
  comment?: string;
}): { ok: true; isVisitor: boolean } | { ok: false; error: string } {
  const db = getDb();
  const event = db
    .prepare(
      `SELECT id, lodge_id, min_degree, allow_visitors, has_meal
       FROM events WHERE id = ?`
    )
    .get(params.eventId) as
    | {
        id: string;
        lodge_id: string;
        min_degree: number;
        allow_visitors: number;
        has_meal: number;
      }
    | undefined;

  if (!event) {
    return { ok: false, error: 'Bijeenkomst niet gevonden.' };
  }

  if (params.user.degree < event.min_degree) {
    return {
      ok: false,
      error: 'Deze arbeid vereist een hogere graad.',
    };
  }

  const memberOfHostLodge = isMemberOfLodge(params.user, event.lodge_id);
  if (!memberOfHostLodge && event.allow_visitors !== 1) {
    return {
      ok: false,
      error: 'Deze bijeenkomst is besloten voor leden van de eigen loge.',
    };
  }

  const isVisitor = memberOfHostLodge ? 0 : 1;
  const joinsMeal =
    params.status === 'attending' && event.has_meal === 1 && params.joinsMeal
      ? 1
      : 0;
  const dietary = (
    params.dietaryNote ??
    params.user.dietaryDefault ??
    ''
  ).trim();
  const comment = (params.comment ?? '').trim();
  const nowIso = new Date().toISOString();

  const existing = db
    .prepare('SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?')
    .get(params.eventId, params.user.id) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE rsvps
       SET status = ?, joins_meal = ?, is_visitor = ?, dietary_note = ?, comment = ?, updated_at = ?
       WHERE id = ?`
    ).run(params.status, joinsMeal, isVisitor, dietary, comment, nowIso, existing.id);
  } else {
    db.prepare(
      `INSERT INTO rsvps (id, event_id, user_id, status, joins_meal, is_visitor, dietary_note, comment, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId('rsvp'),
      params.eventId,
      params.user.id,
      params.status,
      joinsMeal,
      isVisitor,
      dietary,
      comment,
      nowIso
    );
  }

  return { ok: true, isVisitor: isVisitor === 1 };
}

export function getLodgeMembers(
  user: AuthenticatedUser,
  lodgeId: string
): LodgeMemberView[] {
  // Strikte AVG/Discretie-regel: alléén eigen logeleden mogen de ledenlijst van hun loge inzien!
  if (!isMemberOfLodge(user, lodgeId)) {
    return [];
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT u.id as user_id, u.full_name, u.email, u.phone, u.city, u.avatar_url, u.degree,
              m.role, m.officer_title, m.sort_order, m.joined_year
       FROM lodge_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.lodge_id = ?
       ORDER BY m.sort_order ASC, u.full_name ASC`
    )
    .all(lodgeId) as Array<{
    user_id: string;
    full_name: string;
    email: string;
    phone: string;
    city: string;
    avatar_url: string;
    degree: Degree;
    role: LodgeRole;
    officer_title: string | null;
    sort_order: number;
    joined_year: number | null;
  }>;

  return rows.map((r) => ({
    userId: r.user_id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    city: r.city,
    avatarUrl: r.avatar_url || '',
    degree: r.degree,
    role: r.role,
    officerTitle: r.officer_title,
    sortOrder: r.sort_order,
    joinedYear: r.joined_year,
  }));
}

export function getLodgeDocuments(
  user: AuthenticatedUser,
  lodgeId: string
): LodgeDocument[] {
  // Strikte scheiding: alleen eigen loge én maximaal de graad van de ingelogde broeder!
  if (!isMemberOfLodge(user, lodgeId)) {
    return [];
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, lodge_id, title, author, category, min_degree, published_date, summary, content
       FROM documents
       WHERE lodge_id = ? AND min_degree <= ?
       ORDER BY published_date DESC, created_at DESC`
    )
    .all(lodgeId, user.degree) as Array<{
    id: string;
    lodge_id: string;
    title: string;
    author: string;
    category: DocumentCategory;
    min_degree: Degree;
    published_date: string;
    summary: string;
    content: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    lodgeId: r.lodge_id,
    title: r.title,
    author: r.author,
    category: r.category,
    minDegree: r.min_degree,
    publishedDate: r.published_date,
    summary: r.summary,
    content: r.content,
  }));
}

export function getLodgeAnnouncements(
  user: AuthenticatedUser,
  lodgeId: string
): LodgeAnnouncement[] {
  if (!isMemberOfLodge(user, lodgeId)) {
    return [];
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, lodge_id, title, category, author_name, body, is_pinned, created_at
       FROM announcements
       WHERE lodge_id = ?
       ORDER BY is_pinned DESC, created_at DESC`
    )
    .all(lodgeId) as Array<{
    id: string;
    lodge_id: string;
    title: string;
    category: AnnouncementCategory;
    author_name: string;
    body: string;
    is_pinned: number;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    lodgeId: r.lodge_id,
    title: r.title,
    category: r.category,
    authorName: r.author_name,
    body: r.body,
    isPinned: r.is_pinned === 1,
    createdAt: r.created_at,
  }));
}

export function getEventRsvpsForManagement(
  user: AuthenticatedUser,
  eventId: string
): EventRsvpDetail[] {
  const db = getDb();
  const event = db
    .prepare('SELECT lodge_id FROM events WHERE id = ?')
    .get(eventId) as { lodge_id: string } | undefined;

  if (!event || !canManageLodge(user, event.lodge_id)) {
    return [];
  }

  const rows = db
    .prepare(
      `SELECT r.id, r.user_id, r.status, r.joins_meal, r.is_visitor, r.dietary_note, r.comment, r.updated_at,
              u.full_name, u.email, u.phone, u.avatar_url, u.degree,
              hl.name as home_lodge_name, hl.number as home_lodge_number, hl.city as home_lodge_city
       FROM rsvps r
       JOIN users u ON u.id = r.user_id
       JOIN lodges hl ON hl.id = u.primary_lodge_id
       WHERE r.event_id = ?
       ORDER BY r.status ASC, r.is_visitor ASC, u.full_name ASC`
    )
    .all(eventId) as Array<{
    id: string;
    user_id: string;
    status: RsvpStatus;
    joins_meal: number;
    is_visitor: number;
    dietary_note: string;
    comment: string;
    updated_at: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url: string;
    degree: Degree;
    home_lodge_name: string;
    home_lodge_number: number;
    home_lodge_city: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    avatarUrl: r.avatar_url || '',
    degree: r.degree,
    homeLodgeName: r.home_lodge_name,
    homeLodgeNumber: r.home_lodge_number,
    homeLodgeCity: r.home_lodge_city,
    status: r.status,
    joinsMeal: r.joins_meal === 1,
    isVisitor: r.is_visitor === 1,
    dietaryNote: r.dietary_note,
    comment: r.comment,
    updatedAt: r.updated_at,
  }));
}

export function getRecentOutboxEmails(limit = 15): OutboxEmail[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, to_email, to_name, subject, html_body, preview_code, preview_link, delivery_mode, created_at
       FROM email_outbox
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    id: string;
    to_email: string;
    to_name: string;
    subject: string;
    html_body: string;
    preview_code: string | null;
    preview_link: string | null;
    delivery_mode: 'dev_mailbox' | 'smtp';
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    toEmail: r.to_email,
    toName: r.to_name,
    subject: r.subject,
    htmlBody: r.html_body,
    previewCode: r.preview_code,
    previewLink: r.preview_link,
    deliveryMode: r.delivery_mode,
    createdAt: r.created_at,
  }));
}

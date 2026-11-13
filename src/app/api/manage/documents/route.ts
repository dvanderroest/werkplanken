import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageLodge, getDb, newId } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    lodgeId?: string;
    title?: string;
    author?: string;
    category?: string;
    minDegree?: number;
    summary?: string;
    content?: string;
  };

  const lodgeId = body.lodgeId || user.activeLodgeId;
  if (!canManageLodge(user, lodgeId)) {
    return NextResponse.json({ error: 'Geen beheerrechten.' }, { status: 403 });
  }

  const title = (body.title || '').trim();
  const author = (body.author || user.fullName).trim();
  const summary = (body.summary || '').trim();
  const content = (body.content || '').trim();
  const minDegree = Number(body.minDegree || 1);

  if (!title || !content) {
    return NextResponse.json(
      { error: 'Vul een titel en de inhoud van het bouwstuk/document in.' },
      { status: 400 }
    );
  }

  if (![1, 2, 3].includes(minDegree)) {
    return NextResponse.json({ error: 'Ongeldige graad.' }, { status: 400 });
  }

  const db = getDb();
  const todayIso = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO documents (
      id, lodge_id, title, author, category, min_degree, published_date, summary, content, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId('doc'),
    lodgeId,
    title,
    author,
    body.category || 'Bouwstuk',
    minDegree,
    todayIso,
    summary || content.slice(0, 180),
    content,
    new Date().toISOString()
  );

  return NextResponse.json({ ok: true });
}

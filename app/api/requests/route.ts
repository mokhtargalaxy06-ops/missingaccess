import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { AppError, checkOrigin, errorResponse, limit, requireUser, textField } from '@/lib/security';
import { listRequests } from '@/lib/workflow';
import { translations, verse } from '@/lib/content';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json({ requests: listRequests() }); }
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    limit(`create:${user.id}`, 15);
    const body = await request.json();
    if (body.source_kind !== 'quran') throw new AppError('Only Quran translation requests are supported. Please select a QuranEnc source.');
    const title = textField(body.title, 'Title', 8, 100);
    const description = textField(body.description, 'Description', 15, 1000);
    if (body.permission !== true) throw new AppError('Please confirm permission to record and share the selected translation.');
    const key = String(body.translation || '');
    const selected = (await translations()).find(t => t.key === key);
    if (!selected) throw new AppError('Choose an available QuranEnc translation.');
    let language = selected.language;
    try { language = new Intl.DisplayNames(['en'], { type: 'language' }).of(selected.language) || selected.language; } catch { /* Keep provider code if not recognized. */ }
    if (!language) throw new AppError('This translation has no language information. Choose another translation.');
    const source = await verse(key, Number(body.sura), Number(body.aya));
    const existing = db().prepare("SELECT id FROM requests WHERE source_kind='quran' AND source_url=? AND language=?").get(source.url, language) as { id: string } | undefined;
    if (existing) return Response.json({ id: existing.id, existing: true });
    const id = randomUUID();
    db().prepare(`INSERT INTO requests(id,title,description,language,category,source_text,source_url,source_label,source_kind,owner_id,source_arabic,source_footnotes) VALUES (?,?,?,?,'Quran translation',?,?,?,'quran',?,?,?)`).run(id,title,description,language,source.text,source.url,source.label,user.id,source.arabic,source.footnotes);
    return Response.json({ id }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { db, dataDir } from '@/lib/db';
import { AppError, checkOrigin, errorResponse, limit, requireUser, textField } from '@/lib/security';
import { addContribution, audioMime } from '@/lib/workflow';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const user = await requireUser();
    const rows = db().prepare(`SELECT c.id,c.request_id,c.user_id,c.status,c.note,c.review_note,c.created_at,c.mime,u.name,r.title FROM contributions c JOIN users u ON u.id=c.user_id JOIN requests r ON r.id=c.request_id WHERE r.source_kind='quran' AND (c.user_id=? OR (?='reviewer' AND c.status='pending')) ORDER BY c.created_at DESC`).all(user.id,user.role);
    return Response.json({ contributions: rows });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  let filepath: string | undefined;
  try {
    checkOrigin(request);
    const user = await requireUser();
    limit(`upload:${user.id}`, 15);
    const max = 20 * 1024 * 1024;
    if (Number(request.headers.get('content-length') || 0) > max + 65536) throw new AppError('Audio must be smaller than 20 MB.', 413);
    const reader = request.body?.getReader();
    if (!reader) throw new AppError('No recording supplied.');
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max + 65536) { await reader.cancel(); throw new AppError('Audio must be smaller than 20 MB.', 413); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
    const file = form.get('audio');
    if (!(file instanceof File) || !file.size || file.size > max) throw new AppError('Choose an audio file smaller than 20 MB.');
    if (form.get('permission') !== 'true') throw new AppError('Confirm permission to share your recording.');
    const requestId = textField(form.get('request_id'), 'Request', 1, 100);
    const note = textField(form.get('note') || '', 'Note', 0, 1000);
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = audioMime(bytes);
    if (!mime) throw new AppError('Use a WAV, MP3, OGG, WebM, or M4A recording.');
    const filename = randomUUID(); filepath = path.join(dataDir, 'audio', filename);
    await writeFile(filepath, bytes, { flag: 'wx' });
    const id = addContribution(user, requestId, filename, mime, note);
    filepath = undefined;
    return Response.json({ id }, { status: 201 });
  } catch (error) { if (filepath) await unlink(filepath).catch(() => {}); return errorResponse(error); }
}

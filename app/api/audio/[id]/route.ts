import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { db, dataDir } from '@/lib/db';
import { AppError, currentUser, errorResponse } from '@/lib/security';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const row = db().prepare("SELECT c.* FROM contributions c JOIN requests r ON r.id=c.request_id WHERE c.id=? AND r.source_kind='quran'").get((await context.params).id) as { filename: string; mime: string; status: string; user_id: string } | undefined;
    if (!row) throw new AppError('Recording not found.', 404);
    const user = await currentUser();
    if (row.status !== 'approved' && user?.id !== row.user_id && user?.role !== 'reviewer') throw new AppError('This recording is private until approved.', 403);
    const bytes = await readFile(path.join(dataDir, 'audio', row.filename));
    const headers = { 'Content-Type': row.mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline' };
    const range = request.headers.get('range');
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } });
      const start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
      if (start > end || start >= bytes.length) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } });
      return new Response(bytes.subarray(start, end + 1), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': String(end-start+1) } });
    }
    return new Response(bytes, { headers: { ...headers, 'Content-Length': String(bytes.length) } });
  } catch (error) { return errorResponse(error); }
}

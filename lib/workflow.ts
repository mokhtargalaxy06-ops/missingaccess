import { randomUUID } from 'node:crypto';
import { db } from './db';
import { AppError, textField } from './security';
import type { User, RequestItem } from './types';

export function listRequests() {
  return db().prepare(`SELECT r.*, (SELECT COUNT(*) FROM supporters s WHERE s.request_id=r.id) AS supporters,
    c.id AS audio_id,u.name AS contributor_name FROM requests r
    LEFT JOIN contributions c ON c.request_id=r.id AND c.status='approved'
    LEFT JOIN users u ON u.id=c.user_id WHERE r.source_kind='quran' ORDER BY r.sample ASC, r.created_at DESC, r.id ASC`).all() as RequestItem[];
}
export function getRequest(id: string) {
  const row = db().prepare("SELECT * FROM requests WHERE id=? AND source_kind='quran'").get(id) as RequestItem | undefined;
  if (!row) throw new AppError('Request not found.', 404);
  return row;
}
export function addContribution(user: User, requestId: string, filename: string, mime: string, note: string) {
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const item = getRequest(requestId);
    if (item.status !== 'open') throw new AppError('This request already has a recording awaiting review or published.', 409);
    const id = randomUUID();
    database.prepare('INSERT INTO contributions(id,request_id,user_id,filename,mime,note) VALUES (?,?,?,?,?,?)').run(id, requestId, user.id, filename, mime, note);
    database.prepare("UPDATE requests SET status='review' WHERE id=?").run(requestId);
    database.exec('COMMIT');
    return id;
  } catch (error) { database.exec('ROLLBACK'); throw error; }
}
export function reviewContribution(user: User, id: string, decision: unknown, note: unknown) {
  if (user.role !== 'reviewer') throw new AppError('Reviewer access is required.', 403);
  if (decision !== 'approved' && decision !== 'rejected') throw new AppError('Choose approve or request changes.');
  const reviewNote = textField(note, 'Review note', decision === 'rejected' ? 5 : 0, 1000);
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const contribution = database.prepare('SELECT * FROM contributions WHERE id=?').get(id) as { user_id: string; request_id: string; status: string } | undefined;
    if (!contribution) throw new AppError('Recording not found.', 404);
    getRequest(contribution.request_id);
    if (contribution.user_id === user.id) throw new AppError('A different reviewer must check your own recording.', 403);
    if (contribution.status !== 'pending') throw new AppError('This recording has already been reviewed.', 409);
    database.prepare('UPDATE contributions SET status=?,review_note=?,reviewer_id=? WHERE id=?').run(decision, reviewNote, user.id, id);
    database.prepare('UPDATE requests SET status=? WHERE id=?').run(decision === 'approved' ? 'completed' : 'open', contribution.request_id);
    database.exec('COMMIT');
  } catch (error) { database.exec('ROLLBACK'); throw error; }
}
export function audioMime(bytes: Buffer): string | null {
  if (bytes.length < 12) return null;
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE') return 'audio/wav';
  if (bytes.subarray(0, 4).toString() === 'OggS') return 'audio/ogg';
  if (bytes.subarray(0, 4).toString('hex') === '1a45dfa3') return 'audio/webm';
  if (bytes.subarray(4, 8).toString() === 'ftyp') return 'audio/mp4';
  if (bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224)) return 'audio/mpeg';
  return null;
}

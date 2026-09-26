import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import type { User } from './types';

export class AppError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get('ma_session')?.value;
  if (!token) return null;
  return (db().prepare(`SELECT u.id,u.name,u.email,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?`).get(hashToken(token), Date.now()) as User | undefined) || null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError('Please sign in to continue.', 401);
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  db().prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
  db().prepare('INSERT INTO sessions VALUES (?,?,?)').run(hashToken(token), userId, Date.now() + 7 * 86400000);
  (await cookies()).set('ma_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.SECURE_COOKIES === 'true', path: '/', maxAge: 7 * 86400 });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get('ma_session')?.value;
  if (token) db().prepare('DELETE FROM sessions WHERE token=?').run(hashToken(token));
  jar.delete('ma_session');
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  // Next.js can reconstruct request.url with its internal hostname. The Host
  // header retains the browser-facing address, including its port.
  // Reverse-proxy deployments must explicitly configure APP_ORIGIN.
  const url = new URL(request.url);
  const expected = process.env.APP_ORIGIN || `${url.protocol}//${request.headers.get('host') || url.host}`;
  if (origin && origin !== expected) throw new AppError('This request came from a different website.', 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new AppError('Cross-site request refused.', 403);
}
export function limit(key: string, max = 20, windowMs = 600000) {
  const now = Date.now();
  db().prepare('DELETE FROM rate_limits WHERE resets < ?').run(now);
  const row = db().prepare(`INSERT INTO rate_limits(key,count,resets) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`).get(key, now + windowMs) as { count: number };
  if (row.count > max) throw new AppError('Too many attempts. Please try again in a few minutes.', 429);
}
export function textField(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new AppError(`${name} must be between ${min} and ${max} characters.`);
  return value.trim();
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

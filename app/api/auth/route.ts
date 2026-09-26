import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { AppError, checkOrigin, createSession, currentUser, errorResponse, limit, logout, passwordHash, textField, verifyPassword } from '@/lib/security';
export const runtime = 'nodejs';
export async function GET() { return Response.json({ user: await currentUser() }); }
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await request.json();
    if (body.action === 'logout') { await logout(); return Response.json({ ok: true }); }
    if (!['login', 'register'].includes(body.action)) throw new AppError('Unknown action.');
    const email = textField(body.email, 'Email', 5, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email address.');
    if (typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128) throw new AppError('Password must be between 10 and 128 characters.');
    const password = body.password;
    limit(`auth:${email}`, 10);
    limit('auth:global', 200);
    let userId: string;
    if (body.action === 'register') {
      const name = textField(body.name, 'Name', 2, 60);
      if (db().prepare('SELECT 1 FROM users WHERE email=?').get(email)) throw new AppError('An account with this email already exists. Please sign in.', 409);
      userId = randomUUID();
      db().prepare('INSERT INTO users(id,name,email,password) VALUES (?,?,?,?)').run(userId, name, email, passwordHash(password));
    } else {
      const user = db().prepare('SELECT id,password FROM users WHERE email=?').get(email) as { id: string; password: string } | undefined;
      if (!user || !verifyPassword(password, user.password)) throw new AppError('Email or password is incorrect.', 401);
      userId = user.id;
    }
    await createSession(userId);
    return Response.json({ user: await currentUser() });
  } catch (error) { return errorResponse(error); }
}

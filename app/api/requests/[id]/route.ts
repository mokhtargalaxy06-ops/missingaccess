import { db } from '@/lib/db';
import { checkOrigin, currentUser, errorResponse, requireUser } from '@/lib/security';
import { getRequest } from '@/lib/workflow';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const item = getRequest(id);
    const user = await currentUser();
    const contributions = db().prepare(`SELECT c.id,c.request_id,c.user_id,c.status,c.note,c.review_note,c.created_at,c.mime,u.name FROM contributions c JOIN users u ON u.id=c.user_id WHERE c.request_id=? AND (c.status='approved' OR c.user_id=? OR ?='reviewer') ORDER BY c.created_at DESC`).all(id, user?.id || '', user?.role || '');
    const supported = user ? !!db().prepare('SELECT 1 FROM supporters WHERE request_id=? AND user_id=?').get(id, user.id) : false;
    return Response.json({ request: item, contributions, supported });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    getRequest(id);
    db().prepare('INSERT OR IGNORE INTO supporters(request_id,user_id) VALUES (?,?)').run(id,user.id);
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}

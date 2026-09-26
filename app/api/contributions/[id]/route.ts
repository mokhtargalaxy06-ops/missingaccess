import { AppError, checkOrigin, errorResponse, requireUser } from '@/lib/security';
import { reviewContribution } from '@/lib/workflow';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const body = await request.json();
    if (body.decision === 'approved' && body.checked !== true) throw new AppError('Confirm source accuracy, recording quality, and sharing permission first.');
    reviewContribution(user, (await context.params).id, body.decision, body.note || '');
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}

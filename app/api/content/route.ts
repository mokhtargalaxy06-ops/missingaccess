import { translations, verse } from '@/lib/content';
import { errorResponse, limit } from '@/lib/security';
export async function GET(request: Request) {
  try {
    limit('content:global', 200);
    const params = new URL(request.url).searchParams;
    if (params.has('translation')) return Response.json(await verse(params.get('translation') || '', Number(params.get('sura')), Number(params.get('aya'))));
    return Response.json({ translations: await translations() });
  } catch (error) { return errorResponse(error); }
}

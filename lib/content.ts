import { IslamicContentSdk } from 'islamic-content-sdk';
import { AppError } from './security';
const sdk = new IslamicContentSdk();
async function timed<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new AppError('The content provider took too long. Please try again.', 504)), 10000); })]);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('The content provider is unavailable. Please try again later.', 502);
  } finally { clearTimeout(timer!); }
}
let cached: { expires: number; data: { key: string; title: string; language: string }[] } | undefined;
export async function translations(): Promise<{ key: string; title: string; language: string }[]> {
  if (cached && cached.expires > Date.now()) return cached.data;
  const result = await timed(sdk.quranenc.translationList());
  if (!Array.isArray(result?.translations)) throw new AppError('Unexpected response from the content provider.', 502);
  const data = result.translations.filter((x: Record<string, unknown>) => typeof x.key === 'string' && typeof x.title === 'string').map((x: { key: string; title: string; language_iso_code?: string }) => ({ key: x.key, title: x.title, language: x.language_iso_code || '' }));
  cached = { expires: Date.now() + 3600000, data };
  return data;
}
export async function verse(key: string, sura: number, aya: number) {
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(key) || !Number.isInteger(sura) || sura < 1 || sura > 114 || !Number.isInteger(aya) || aya < 1 || aya > 286) throw new AppError('Choose a valid translation, surah, and verse.');
  const response = await timed(sdk.quranenc.translationAya(key, sura, aya));
  const result = response?.result;
  if (!result || typeof result.translation !== 'string') throw new AppError('This verse was not found in the selected translation.', 404);
  if (typeof result.arabic_text !== 'string' || !result.arabic_text) throw new AppError('The provider did not return the Arabic verse. Please try again.', 502);
  const plain = (value: unknown) => String(value || '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return { text: plain(result.translation), arabic: plain(result.arabic_text), footnotes: plain(result.footnotes), label: `Quran ${sura}:${aya} · ${key}`, url: `https://quranenc.com/en/browse/${key}/${sura}#${aya}` };
}

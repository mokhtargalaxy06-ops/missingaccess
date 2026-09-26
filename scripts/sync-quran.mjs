import { IslamicContentSdk } from 'islamic-content-sdk';
import { writeFile } from 'node:fs/promises';

const sdk = new IslamicContentSdk();
const choices = [
  ['french_montada', 'French', 1, 1, 'Al-Fatihah · The Opening'],
  ['english_rwwad', 'English', 1, 2, 'Al-Fatihah · Praise and gratitude'],
  ['french_montada', 'French', 94, 5, 'Ash-Sharh · With hardship comes ease'],
  ['english_rwwad', 'English', 112, 1, 'Al-Ikhlas · Sincerity'],
  ['french_montada', 'French', 2, 152, 'Al-Baqarah · Remembrance'],
  ['english_rwwad', 'English', 93, 11, 'Ad-Duha · Gratitude']
];
const plain = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const verses = await Promise.all(choices.map(async ([key, language, sura, aya, title]) => {
  const response = await sdk.quranenc.translationAya(key, sura, aya);
  const result = response?.result;
  if (typeof result?.translation !== 'string' || typeof result?.arabic_text !== 'string' || !result.arabic_text) throw new Error(`Incomplete QuranEnc response for ${key} ${sura}:${aya}`);
  return { id: `quran-${key}-${sura}-${aya}`, title, language, sura, aya, translation: key,
    text: plain(result.translation), arabic: plain(result.arabic_text), footnotes: plain(result.footnotes),
    label: `Quran ${sura}:${aya} · ${key}`, url: `https://quranenc.com/en/browse/${key}/${sura}#${aya}`,
    retrieved_at: new Date().toISOString() };
}));
await writeFile(new URL('../lib/quran-starters.json', import.meta.url), JSON.stringify(verses, null, 2) + '\n');
console.log(`Saved ${verses.length} sourced Quran verses with Arabic, translations, references, and footnotes.`);

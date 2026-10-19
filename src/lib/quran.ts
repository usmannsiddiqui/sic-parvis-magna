export type AyahRef = { surah: number; ayah: number };

export type AyahData = {
  ref: string;
  surahName: string;
  arabic: string;
  en: string;
  ur: string;
  audioUrl: string;
};

const cache = new Map<string, Promise<AyahData>>();

export function parseAyahRef(ref: string): AyahRef {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(ref);
  if (!match || match[0] !== ref) throw new Error(`Invalid ayah ref: ${ref}`);
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  if (surah < 1 || surah > 114 || ayah < 1) {
    throw new Error(`Invalid ayah ref: ${ref}`);
  }
  return { surah, ayah };
}

export function everyAyahUrl({ surah, ayah }: AyahRef): string {
  return `https://everyayah.com/data/Ali_Jaber_64kbps/${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;
}

type Edition = {
  edition: { identifier: string };
  text: string;
  surah: { englishName: string };
};

export async function fetchAyah(ref: string, fetchImpl: typeof fetch = fetch): Promise<AyahData> {
  const parsed = parseAyahRef(ref);
  const cached = cache.get(ref);
  if (cached) return cached;

  const pending = (async (): Promise<AyahData> => {
    try {
      const response = await fetchImpl(
        `https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,en.sahih,ur.jalandhry`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: { code: number; data: Edition[] } = await response.json();
      if (body.code !== 200) throw new Error(`API code ${body.code}`);
      const arabic = body.data.find((item) => item.edition.identifier === 'quran-uthmani');
      const en = body.data.find((item) => item.edition.identifier === 'en.sahih');
      const ur = body.data.find((item) => item.edition.identifier === 'ur.jalandhry');
      if (!arabic?.text || !en?.text || !ur?.text || !arabic.surah?.englishName) {
        throw new Error('Missing verse text or surah name');
      }
      return {
        ref,
        surahName: arabic.surah.englishName,
        arabic: arabic.text,
        en: en.text,
        ur: ur.text,
        audioUrl: everyAyahUrl(parsed),
      };
    } catch (cause) {
      throw new Error(`Failed to fetch ayah ${ref}`, { cause });
    }
  })();
  cache.set(ref, pending);
  pending.catch(() => cache.delete(ref));
  return pending;
}

export function clearAyahCache(): void {
  cache.clear();
}

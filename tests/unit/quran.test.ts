import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAyahCache, everyAyahUrl, fetchAyah, parseAyahRef } from '../../src/lib/quran';

const fixture = {
  code: 200,
  status: 'OK',
  data: [
    {
      edition: { identifier: 'ur.jalandhry' },
      text: 'اور میں اپنے تئیں پاک صاف نہیں کہتا …',
      surah: { englishName: 'Yusuf' },
    },
    {
      edition: { identifier: 'quran-uthmani' },
      text: 'وَمَآ أُبَرِّئُ نَفْسِىٓ …',
      surah: { englishName: 'Yusuf' },
    },
    {
      edition: { identifier: 'en.sahih' },
      text: 'And I do not acquit myself. …',
      surah: { englishName: 'Yusuf' },
    },
  ],
};
const successFetch = () =>
  vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(fixture)));

describe('Quran verse data', () => {
  beforeEach(clearAyahCache);
  afterEach(() => vi.unstubAllGlobals());

  it('parses a valid ref', () => {
    expect(parseAyahRef('12:53')).toEqual({ surah: 12, ayah: 53 });
  });
  it.each(['115:1', '0:1', '12:0', '12-53', '', 'abc', '1234:1', '1:1234', ' 12:53', '12:53\n'])(
    'rejects %s',
    (ref) => {
      expect(() => parseAyahRef(ref)).toThrow(ref || /ref/);
    },
  );
  it('pads the EveryAyah url', () => {
    expect(everyAyahUrl({ surah: 12, ayah: 53 })).toBe(
      'https://everyayah.com/data/Ali_Jaber_64kbps/012053.mp3',
    );
    expect(everyAyahUrl({ surah: 2, ayah: 286 })).toBe(
      'https://everyayah.com/data/Ali_Jaber_64kbps/002286.mp3',
    );
  });
  it('maps editions by identifier regardless of order', async () => {
    await expect(fetchAyah('12:53', successFetch())).resolves.toEqual({
      ref: '12:53',
      surahName: 'Yusuf',
      arabic: 'وَمَآ أُبَرِّئُ نَفْسِىٓ …',
      en: 'And I do not acquit myself. …',
      ur: 'اور میں اپنے تئیں پاک صاف نہیں کہتا …',
      audioUrl: 'https://everyayah.com/data/Ali_Jaber_64kbps/012053.mp3',
    });
  });
  it('requests the exact editions url', async () => {
    const f = successFetch();
    await fetchAyah('12:53', f);
    expect(f).toHaveBeenCalledWith(
      'https://api.alquran.cloud/v1/ayah/12:53/editions/quran-uthmani,en.sahih,ur.jalandhry',
    );
  });
  it.each([
    [404, 404],
    [500, 200],
    [200, 404],
  ])('throws with the ref on HTTP %s / API %s', async (status, code) => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ code, status: 'NOT FOUND', data: 'out of range' }), {
          status,
        }),
      );
    await expect(fetchAyah('12:999', f)).rejects.toThrow('12:999');
  });
  it('fetches each ref once, including concurrent requests', async () => {
    const f = successFetch();
    const [first, second] = await Promise.all([fetchAyah('12:53', f), fetchAyah('12:53', f)]);
    expect(second).toEqual(first);
    await expect(fetchAyah('12:53', f)).resolves.toEqual(first);
    expect(f).toHaveBeenCalledTimes(1);
    await fetchAyah('12:18', f);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('clears cached verses', async () => {
    const f = successFetch();
    await fetchAyah('12:53', f);
    clearAyahCache();
    await fetchAyah('12:53', f);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('defaults to global fetch', async () => {
    const f = successFetch();
    vi.stubGlobal('fetch', f);
    expect((await fetchAyah('12:53')).surahName).toBe('Yusuf');
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid refs before fetching', async () => {
    const f = successFetch();
    await expect(fetchAyah('115:1', f)).rejects.toThrow('115:1');
    expect(f).not.toHaveBeenCalled();
  });
  it('includes the ref when the API is unreachable', async () => {
    const f = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
    await expect(fetchAyah('12:53', f)).rejects.toThrow('12:53');
  });
  it('fails loudly if a translation is missing', async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ ...fixture, data: fixture.data.slice(1) })));
    await expect(fetchAyah('12:53', f)).rejects.toThrow('12:53');
  });
});

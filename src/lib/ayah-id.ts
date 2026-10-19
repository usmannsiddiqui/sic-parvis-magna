let seq = 0;

export function nextAyahId(surah: number, ayah: number): string {
  return `ayah-${surah}-${ayah}-${++seq}`;
}

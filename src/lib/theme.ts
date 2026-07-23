export type Theme = 'light' | 'dark';

/** First-visit resolution: explicit stored choice wins, else system preference, else light. */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme, doc: Document, storage: Pick<Storage, 'setItem'>): void {
  doc.documentElement.setAttribute('data-theme', theme);
  try {
    storage.setItem('spm-theme', theme);
  } catch {
    /* storage unavailable (private mode) — attribute still applied */
  }
}

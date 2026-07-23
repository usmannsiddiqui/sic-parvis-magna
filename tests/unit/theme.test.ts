import { describe, it, expect, vi } from 'vitest';
import { resolveInitialTheme, nextTheme, applyTheme } from '../../src/lib/theme';

describe('resolveInitialTheme', () => {
  it('uses a valid stored value over system preference', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark');
    expect(resolveInitialTheme('light', true)).toBe('light');
  });

  it('falls back to system preference when nothing valid is stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme(null, false)).toBe('light');
  });

  it('defaults to light for a garbage stored value', () => {
    expect(resolveInitialTheme('purple', false)).toBe('light');
  });
});

describe('nextTheme', () => {
  it('toggles between light and dark', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });
});

describe('applyTheme', () => {
  it('sets the data-theme attribute and persists the choice', () => {
    const setItem = vi.fn();
    applyTheme('dark', document, { setItem });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(setItem).toHaveBeenCalledWith('spm-theme', 'dark');
  });
});

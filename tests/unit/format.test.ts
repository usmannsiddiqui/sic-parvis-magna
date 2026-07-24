import { describe, it, expect } from 'vitest';
import { formatDate } from '../../src/lib/format';

describe('formatDate', () => {
  it('formats a date as long US month day, year', () => {
    expect(formatDate(new Date('2026-01-14T00:00:00Z'))).toBe('January 14, 2026');
  });
  it('is timezone-stable at day boundaries (UTC)', () => {
    expect(formatDate(new Date('2026-02-18T00:00:00Z'))).toBe('February 18, 2026');
  });
});

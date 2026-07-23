import { describe, it, expect } from 'vitest';
import { readingTimeMinutes, readingTimeLabel } from '../../src/lib/reading-time';

describe('readingTimeMinutes', () => {
  it('returns 1 minute for empty or short text', () => {
    expect(readingTimeMinutes('')).toBe(1);
    expect(readingTimeMinutes('one two three')).toBe(1);
  });

  it('rounds up to the next whole minute at 200 wpm', () => {
    expect(readingTimeMinutes(Array(201).fill('word').join(' '))).toBe(2);
    expect(readingTimeMinutes(Array(400).fill('word').join(' '))).toBe(2);
    expect(readingTimeMinutes(Array(401).fill('word').join(' '))).toBe(3);
  });
});

describe('readingTimeLabel', () => {
  it('formats as "N min read"', () => {
    expect(readingTimeLabel('')).toBe('1 min read');
    expect(readingTimeLabel(Array(201).fill('word').join(' '))).toBe('2 min read');
  });
});

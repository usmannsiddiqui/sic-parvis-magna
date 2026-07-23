const WORDS_PER_MINUTE = 200;

/** Whole minutes to read `text`, from word count, rounded up, never below 1. */
export function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Human label, e.g. "3 min read". */
export function readingTimeLabel(text: string): string {
  return `${readingTimeMinutes(text)} min read`;
}

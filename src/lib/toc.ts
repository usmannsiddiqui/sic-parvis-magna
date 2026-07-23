export interface TocEntry {
  slug: string;
  text: string;
  children: TocEntry[];
}

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

/** Build a two-level TOC (h2 with nested h3) from Astro's `headings`. h1/h4+ ignored. */
export function buildToc(headings: Heading[]): TocEntry[] {
  const toc: TocEntry[] = [];
  for (const { depth, slug, text } of headings) {
    if (depth === 2) {
      toc.push({ slug, text, children: [] });
    } else if (depth === 3 && toc.length > 0) {
      toc[toc.length - 1].children.push({ slug, text, children: [] });
    }
  }
  return toc;
}

// Vitest stub for the `astro:content` virtual module, which only exists inside
// Astro's build. We re-export Astro's own bundled Zod so schema unit tests
// validate against the exact same Zod build the real content collections use.
export { z } from 'astro/zod';

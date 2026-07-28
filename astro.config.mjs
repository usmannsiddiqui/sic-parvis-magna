import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // placeholder; custom domain set in Phase 8
  site: 'https://sic-parvis-magna.pages.dev',

  trailingSlash: 'never',

  integrations: [mdx()],

  markdown: {
    shikiConfig: {
      // github-light's default orange (#E36209) and github-dark's comment gray
      // (#6A737D) both fail WCAG AA on their backgrounds; the high-contrast
      // variants clear 4.5:1 while staying built-in Shiki themes.
      themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
      defaultColor: false, // emit raw --shiki-light / --shiki-dark vars; we switch them by [data-theme]
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});

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
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false, // emit raw --shiki-light / --shiki-dark vars; we switch them by [data-theme]
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});

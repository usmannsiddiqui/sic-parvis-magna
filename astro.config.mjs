import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // placeholder; custom domain set in Phase 8
  site: 'https://sic-parvis-magna.pages.dev',

  trailingSlash: 'never',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [mdx()],
});

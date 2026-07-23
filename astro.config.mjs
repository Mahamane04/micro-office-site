import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // Output mode: hybrid = SSG + ISR on-demand
  output: 'hybrid',

  // Dev server port (matches .claude/launch.json)
  server: { port: 8080 },

  // Netlify adapter for ISR + Edge Functions
  adapter: netlify({
    edgeMiddleware: true,
    imageCDN: false, // Use Cloudinary for image optimization
  }),

  // Integrations
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],

  // Images: served/optimized by Cloudinary (no local sharp pipeline —
  // no astro:assets/<Image> usage anywhere in src/).

  // Site URL for canonicals and sitemap
  site: 'https://www.microofficeml.com',
});

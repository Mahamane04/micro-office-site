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

  // Image optimization
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },

  // Vite config
  vite: {
    ssr: {
      external: ['sharp'],
    },
  },

  // Site URL for canonicals and sitemap
  site: 'https://www.microofficeml.com',
});

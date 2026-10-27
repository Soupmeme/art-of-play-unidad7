import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the built site works from any folder, including
  // GitHub Pages' /art-of-play-unidad7/ (see .github/workflows/deploy.yml).
  base: './',
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});

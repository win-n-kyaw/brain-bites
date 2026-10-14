import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from a GitHub Pages sub-path.
  base: './',
  // Lessons live in /content and art/audio in /assets (see design doc §9),
  // both pulled in via import.meta.glob, so there is no /public folder.
  publicDir: false,
  build: {
    // Phaser alone is ~1.2 MB minified.
    chunkSizeWarningLimit: 1600,
  },
});

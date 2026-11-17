import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    // Frugal by design: warn if a chunk gets heavy. See docs/ARCHITECTURE.md (performance budget).
    chunkSizeWarningLimit: 350,
  },
});

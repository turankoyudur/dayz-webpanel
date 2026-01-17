import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the web UI.
// The server (apps/server) will serve the built output from apps/web/dist.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});

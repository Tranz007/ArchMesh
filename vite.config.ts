import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/viewer',
    emptyOutDir: false,
  },
  server: {
    port: 4242,
    strictPort: true,
  },
});

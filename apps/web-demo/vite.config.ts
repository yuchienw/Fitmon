import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@fitmon/engine': path.resolve(__dirname, '../../packages/engine/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});

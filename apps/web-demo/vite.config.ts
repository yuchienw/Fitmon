import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function cspPlugin(): Plugin {
  return {
    name: 'fitmon-csp-meta',
    apply: 'build',
    transformIndexHtml(html: string) {
      const cspPolicy =
        "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://raw.githubusercontent.com; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests";
      const metaTag = `<meta http-equiv="Content-Security-Policy" content="${cspPolicy}" />`;
      return html.replace('<head>', `<head>\n    ${metaTag}`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), cspPlugin()],
  resolve: {
    alias: {
      '@fitmon/engine': path.resolve(__dirname, '../../packages/engine/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});

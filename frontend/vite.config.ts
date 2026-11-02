import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    watch: { usePolling: true, interval: 300 },
    proxy: { '/api': { target: process.env.ATLAS_API_PROXY ?? 'http://localhost:8001', changeOrigin: true } },
    allowedHosts: ['localhost', 'web'],
  },
  build: { outDir: 'dist', sourcemap: true, target: 'es2022' },
});

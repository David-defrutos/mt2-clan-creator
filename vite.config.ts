import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5174, proxy: { '/api': 'http://127.0.0.1:4320' } },
  build: { outDir: 'dist' }
});
// 2026-11-15-0828||codex-clan-editor||clan-creator/vite.config.ts||Separar servidor de desarrollo web 5174 y proxy al creador 4320

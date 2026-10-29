import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  base: '/plan-editor/',
  plugins: [
    { name: 'pascal-local-assets', enforce: 'pre', transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return;
      return code.replace(/(["'`])\/(icons|audios|hdri|items|material|fonts)\//g, '$1/plan-editor/$2/');
    } },
    react(), tailwind(),
  ],
  resolve: { alias: [
    { find: /^@pascal-app\/editor$/, replacement: local('./vendor/editor/src/index.tsx') },
    { find: 'next/image', replacement: local('./src/next-image.tsx') },
    { find: 'next/link', replacement: local('./src/next-link.tsx') },
  ], dedupe: ['react', 'react-dom', 'three', '@pascal-app/core', '@pascal-app/viewer'] },
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production') },
  build: { target: 'esnext', outDir: '../../dist/plan-editor', emptyOutDir: false, chunkSizeWarningLimit: 1500 },
  server: { host: '127.0.0.1', port: 3002 },
});

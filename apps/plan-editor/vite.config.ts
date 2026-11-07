import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { adaptBundledAssets } from './asset-paths.mjs';
import { adaptColumnDefaults } from './column-defaults.mjs';

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  base: '/plan-editor/',
  plugins: [
    { name: 'pascal-local-assets', enforce: 'pre', transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id)) return;
      if (/[\\/]nodes[\\/]dist[\\/]column[\\/]tool\.js$/.test(id)) code = adaptColumnDefaults(code);
      if (/[\\/]viewer[\\/]dist[\\/]lib[\\/]asset-url\.js$/.test(id)) {
        code = code.replace(/export const ASSETS_CDN_URL = [^;]+;/, "export const ASSETS_CDN_URL = ''; ");
        code = code.replaceAll("if (!url)", "if (url?.startsWith('data:image/') || url?.startsWith('data:model/gltf-binary;base64,')) return url;\n    if (!url)");
      }
      if (/[\\/]core[\\/]dist[\\/]schema[\\/]asset-url\.js$/.test(id)) {
        code = code.replace("if (url.startsWith('data:image/'))", "if (/^data:model\\/gltf-binary;base64,[A-Za-z0-9+/]+={0,2}$/.test(url)) return true;\n    if (url.startsWith('data:image/'))");
      }
      const catalog = /[\\/](material-library\.js|catalog-items\.tsx)$/.test(id);
      return (catalog ? adaptBundledAssets(code, local('./public')) : code).replace(/(["'`])\/(icons|audios|hdri|items|material|fonts)\//g, '$1/plan-editor/$2/');
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

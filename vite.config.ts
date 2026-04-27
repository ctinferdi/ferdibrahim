import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Always bundle admin config with the main vendor chunk
          if (id.includes('/src/config/')) {
            return 'vendor';
          }
        }
      }
    }
  }
})

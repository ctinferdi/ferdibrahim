import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { handleAIRequest } from './server/aiEndpoint'

function localAIEndpoint(env: Record<string, string>): Plugin {
  return {
    name: 'local-ai-endpoint',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/analyze-floorplan') return next()
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'POST isteği gerekli.' }))
          return
        }

        const chunks: Uint8Array[] = []
        let bytes = 0
        let overLimit = false
        req.on('data', (chunk: Uint8Array) => {
          bytes += chunk.byteLength
          if (bytes > 5_000_000) {
            overLimit = true
            chunks.length = 0
          } else if (!overLimit) {
            chunks.push(chunk)
          }
        })
        req.on('end', async () => {
          if (overLimit) {
            res.statusCode = 413
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Dosya çok büyük. En fazla 3 MB boyutunda dosya yükleyin.' }))
            return
          }
          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            const result = await handleAIRequest(payload, req.headers.authorization, {
              geminiApiKey: env.GEMINI_API_KEY,
              supabaseUrl: env.VITE_SUPABASE_URL,
              supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
            })
            res.statusCode = result.status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(result.body))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'İstek okunamadı.' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), localAIEndpoint(env)],
    server: {
      port: 3000,
      host: '127.0.0.1',
    },
    build: {
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/src/config/')) return 'vendor'
          }
        }
      }
    },
  }
})

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function enrichDevApi(): Plugin {
  return {
    name: 'media-list-enrich-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/enrich')) {
          next()
          return
        }

        try {
          const enrichPath = path.resolve(rootDir, 'netlify/functions/enrich.mts')
          const mod = await server.ssrLoadModule(pathToFileURL(enrichPath).href)
          const handler = mod.default as (request: Request) => Promise<Response>

          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const body = Buffer.concat(chunks)

          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
            else if (Array.isArray(value)) headers.set(key, value.join(','))
          }

          const request = new Request(`http://127.0.0.1${req.url}`, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : body,
          })

          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            res.setHeader(key, value)
          })
          const text = await response.text()
          res.end(text)
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              mode: 'mock',
              query: '',
              mediaType: 'movie',
              candidates: [],
              warnings: [],
              error:
                error instanceof Error
                  ? error.message
                  : 'Enrichment middleware failed.',
            }),
          )
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), enrichDevApi()],
  server: {
    port: 5173,
  },
})

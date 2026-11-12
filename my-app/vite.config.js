import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sendPushHandler from './api/send-push.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-push-server',
      configureServer(server) {
        server.middlewares.use('/api/send-push', async (req, res, next) => {
          if (req.method === 'POST' || req.method === 'OPTIONS') {
            try {
              await sendPushHandler(req, res)
            } catch (err) {
              console.error('Push server error:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          } else {
            next()
          }
        })
      }
    }
  ],
  base: '/',
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
    historyApiFallback: true,
  },
  optimizeDeps: {
    include: ['html2pdf.js'],
  },
})

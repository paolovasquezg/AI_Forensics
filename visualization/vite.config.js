import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'serve-data',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/data/')) return next()
          const relativePath = req.url.slice('/data/'.length).split('?')[0]
          const filePath = path.resolve(__dirname, '..', 'data', relativePath)
          if (!fs.existsSync(filePath)) return next()
          const content = fs.readFileSync(filePath)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(content)
        })
      }
    }
  ]
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Sirve la normativa incluida en la previsualización web y relaja la CSP
 * solo en este entorno para que el iframe `srcdoc` pueda ejecutar el JS de la
 * guía. En Electron la normativa se sirve por el protocolo `normativa:`.
 */
function normativaWeb(): Plugin {
  return {
    name: 'normativa-web',
    configureServer(server) {
      server.middlewares.use('/normativa-fp/index.html', (_req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(resolve('resources/normativa-fp/index.html')))
      })
    },
    transformIndexHtml(html) {
      return html
        .replace("script-src 'self';", "script-src 'self' 'unsafe-inline';")
        .replace("frame-src 'self' normativa:;", "frame-src 'self' normativa: data: blob:;")
    }
  }
}

/**
 * Configuración de la previsualización web.
 *
 * La aplicación real es Electron y habla con el proceso principal por IPC.
 * Este servidor sirve el mismo renderer en el navegador con una API simulada
 * (`src/renderer/src/dev/api-web.ts`) para revisar la interfaz sin abrir
 * Electron.
 */
export default defineConfig({
  root: resolve('src/renderer'),
  publicDir: resolve('resources/boe'),
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  plugins: [vue(), normativaWeb()],
  server: {
    port: 5173,
    strictPort: true
  }
})

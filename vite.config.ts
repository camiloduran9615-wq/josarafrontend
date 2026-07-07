import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Carga las variables .env del modo activo (development / production)
  const env = loadEnv(mode, process.cwd(), '')

  const apiTarget = env.VITE_API_TARGET ?? 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      port: 3000,
      host: 'localhost',
      hmr: {
        host: 'localhost',
        port: 3000,
      },
      // ── Proxy: todas las rutas /api se reenvían al backend Laravel ──────
      // Esto es lo que permite usar baseURL: '/api/v1' en axios sin CORS.
      // Si el backend cambia de puerto, edita VITE_API_TARGET en .env.development
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // Útil para debug: descomenta para ver cada request proxiado
          // configure: (proxy) => {
          //   proxy.on('proxyReq', (_, req) => console.log('[proxy]', req.method, req.url))
          // },
        },
        '/logo_claro.png': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/logo_oscuro.png': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/favicon.ico': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})

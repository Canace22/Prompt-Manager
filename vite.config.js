import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // VITE_BASE 用于 Docker 部署（/），未设置时 GitHub Pages 用 /Prompt-Manager/
  base: process.env.VITE_BASE ?? (process.env.NODE_ENV === 'production' ? '/Prompt-Manager/' : '/'),
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: o site funciona em qualquer subcaminho (ex.: GitHub Pages em /spotify-stats/)
export default defineConfig({
  base: './',
  plugins: [react()],
})

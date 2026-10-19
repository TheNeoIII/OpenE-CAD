import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'

const versionPath = fileURLToPath(new URL('./src/build-version.json', import.meta.url))
function incrementVersion() {
  const current = JSON.parse(readFileSync(versionPath, 'utf8')) as { revision: number }
  writeFileSync(versionPath, JSON.stringify({ revision: current.revision + 1 }) + '\n')
}
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Self-hosted static SPA; /api is reverse-proxied to the Rust service.
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'incremental-build-version',
    buildStart() { incrementVersion() },
    handleHotUpdate(ctx) {
      if (ctx.file !== versionPath && /\.(tsx?|css)$/.test(ctx.file)) incrementVersion()
    },
  }],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  base: './',
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    outDir: 'dist',
  },
})

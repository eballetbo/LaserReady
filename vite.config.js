import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import { execSync } from 'node:child_process'
import { visualizer } from 'rollup-plugin-visualizer'

const commitCount = parseInt(
  execSync('git rev-list --count HEAD').toString().trim(), 10
)
const major = Math.floor(commitCount / 10000)
const minor = Math.floor((commitCount % 10000) / 100)
const patch = commitCount % 100
const APP_VERSION = `${major}.${minor}.${patch}`

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isElectron = process.env.VITE_ELECTRON === 'true'

  return {
    plugins: [
      react(),
      mode === 'analyze' && visualizer({ open: true }),
      isElectron && electron({
        main: {
          entry: 'electron/main.ts',
        },
        preload: {
          input: 'electron/preload.ts',
        },
        renderer: {},
      }),
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'paper-vendor' : ['paper'],
            'react-vendor': ['react', 'react-dom'],
            'ui-libs': ['lucide-react'], 
          },
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
    base: isElectron ? './' : (process.env.VITE_BASE || '/'),
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e/**'],
    },
  }
})

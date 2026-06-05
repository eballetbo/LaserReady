import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'node:path'
import { visualizer } from 'rollup-plugin-visualizer'

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
    base: isElectron ? './' : '/',
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e/**'],
    },
  }
})

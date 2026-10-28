import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

const alias = {
  '@renderer': resolve('src/renderer/src'),
  '@shared': resolve('src/shared')
}

export default defineConfig({
  main: {
    resolve: { alias },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    resolve: { alias },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: { alias },
    plugins: [vue()]
  }
})

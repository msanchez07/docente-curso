import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

async function arrancar(): Promise<void> {
  // En el navegador no existe el puente de Electron: se instala una API
  // simulada solo en desarrollo. Dentro de Electron, `window.api` ya está.
  if (!window.api && import.meta.env.DEV) {
    const { instalarApiWeb } = await import('./dev/api-web')
    instalarApiWeb()
  }

  createApp(App).use(createPinia()).use(router).mount('#app')
}

void arrancar()

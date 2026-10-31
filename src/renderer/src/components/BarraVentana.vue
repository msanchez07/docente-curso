<script setup lang="ts">
import { computed } from 'vue'
import { APP } from '@shared/autor'
import icono from '@renderer/assets/icono-app.png'

const plataforma = window.api.app.plataforma
const esMac = computed(() => plataforma === 'darwin')
const esWeb = computed(() => plataforma === 'web')
</script>

<template>
  <header
    class="barra-ventana"
    :class="{ 'barra-ventana--mac': esMac, 'barra-ventana--web': esWeb }"
  >
    <div class="barra-ventana__marca">
      <img :src="icono" alt="" class="barra-ventana__logo" />
      <span class="barra-ventana__nombre">{{ APP.nombre }}</span>
      <span class="barra-ventana__subtitulo">{{ APP.subtitulo }}</span>
    </div>
  </header>
</template>

<style scoped>
.barra-ventana {
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 150px 0 14px;
  background: #101a2b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: #e8edf6;
  -webkit-app-region: drag;
  user-select: none;
}

.barra-ventana--mac {
  padding-left: 82px;
  padding-right: 14px;
}

.barra-ventana--web {
  padding-right: 14px;
}

.barra-ventana__marca {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.barra-ventana__logo {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  flex: 0 0 auto;
}

.barra-ventana__nombre {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.barra-ventana__subtitulo {
  overflow: hidden;
  color: #8ea3bb;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .barra-ventana__subtitulo {
    display: none;
  }
}
</style>

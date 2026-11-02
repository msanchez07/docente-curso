<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { EventoActualizacion } from '@shared/tipos'

const evento = ref<EventoActualizacion | null>(null)
const descartado = ref(false)
let desuscribir: (() => void) | undefined

const visible = computed(
  () =>
    evento.value !== null &&
    !descartado.value &&
    ['disponible', 'descargando', 'lista', 'error'].includes(evento.value.estado)
)

const porcentaje = computed(() => Math.max(0, Math.min(100, evento.value?.porcentaje ?? 0)))

function formatearBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '0 MB'
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function instalar(): void {
  void window.api.actualizaciones.descargar()
  evento.value = { estado: 'descargando', porcentaje: 0 }
  descartado.value = false
}

function reiniciar(): void {
  void window.api.actualizaciones.instalar()
}

function reintentar(): void {
  descartado.value = false
  void window.api.actualizaciones.reintentar()
}

function abrirDescarga(): void {
  void window.api.actualizaciones.abrirDescarga()
}

onMounted(() => {
  desuscribir = window.api.actualizaciones.onEvento((nuevo) => {
    evento.value = nuevo
    if (nuevo.estado !== 'no-disponible' && nuevo.estado !== 'comprobando') {
      descartado.value = false
    }
  })
})

onBeforeUnmount(() => desuscribir?.())
</script>

<template>
  <aside
    v-if="visible && evento"
    class="actualizacion"
    :class="`actualizacion--${evento.estado}`"
    :role="evento.estado === 'error' ? 'alert' : 'status'"
    aria-live="polite"
  >
    <div class="actualizacion__cabecera">
      <div class="actualizacion__texto">
        <strong v-if="evento.estado === 'disponible'">
          Nueva versión disponible{{ evento.version ? `: ${evento.version}` : '' }}
        </strong>
        <strong v-else-if="evento.estado === 'descargando'">Descargando actualización…</strong>
        <strong v-else-if="evento.estado === 'lista'">Actualización preparada</strong>
        <strong v-else>No se pudo actualizar</strong>

        <span v-if="evento.estado === 'disponible'" class="actualizacion__detalle">
          ¿Quieres descargarla e instalarla ahora?
        </span>
        <span v-else-if="evento.estado === 'descargando'" class="actualizacion__detalle">
          {{ Math.round(porcentaje) }}% · {{ formatearBytes(evento.transferido) }} de
          {{ formatearBytes(evento.total) }}
        </span>
        <span v-else-if="evento.estado === 'lista'" class="actualizacion__detalle">
          Reinicia la aplicación para terminar de instalarla.
        </span>
        <span v-else class="actualizacion__detalle">{{ evento.mensaje }}</span>
      </div>

      <button
        v-if="evento.estado !== 'descargando'"
        class="actualizacion__cerrar"
        type="button"
        aria-label="Ocultar aviso de actualización"
        @click="descartado = true"
      >
        ×
      </button>
    </div>

    <div v-if="evento.estado === 'descargando'" class="actualizacion__progreso">
      <span :style="{ width: `${porcentaje}%` }"></span>
    </div>

    <div v-if="evento.estado !== 'descargando'" class="actualizacion__acciones">
      <template v-if="evento.estado === 'disponible'">
        <button class="boton boton--principal" type="button" @click="instalar">
          Instalar ahora
        </button>
        <button class="boton" type="button" @click="descartado = true">Más tarde</button>
      </template>
      <template v-else-if="evento.estado === 'lista'">
        <button class="boton boton--principal" type="button" @click="reiniciar">
          Reiniciar e instalar
        </button>
        <button class="boton" type="button" @click="descartado = true">Más tarde</button>
      </template>
      <template v-else-if="evento.estado === 'error'">
        <button class="boton boton--principal" type="button" @click="abrirDescarga">
          Descargar manualmente
        </button>
        <button class="boton" type="button" @click="reintentar">Reintentar</button>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.actualizacion {
  position: fixed;
  right: 24px;
  bottom: 22px;
  z-index: 60;
  width: min(520px, calc(100vw - 48px));
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: #101a2b;
  color: #e8edf6;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
}

.actualizacion--error {
  border-color: #f0b4ae;
}

.actualizacion__cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.actualizacion__texto {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.actualizacion__texto strong {
  font-size: 13.5px;
}

.actualizacion__detalle {
  color: #a9bbcf;
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.actualizacion__cerrar {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #a9bbcf;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.actualizacion__cerrar:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.actualizacion__progreso {
  height: 6px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.actualizacion__progreso span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2dd4bf, #60a5fa);
  transition: width 0.2s ease;
}

.actualizacion__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.actualizacion__acciones .boton {
  height: 32px;
  padding: 0 12px;
  font-size: 12.5px;
}
</style>

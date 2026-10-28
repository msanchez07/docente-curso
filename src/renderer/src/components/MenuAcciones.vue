<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

export type IconoAccion =
  | 'notas'
  | 'correo'
  | 'formacion'
  | 'editar'
  | 'desactivar'
  | 'reactivar'
  | 'quitar'
  | 'evidencias'
  | 'bloquear'
  | 'desbloquear'
  | 'borrar'
  | 'programacion'
  | 'criterios'
  | 'importar'
  | 'descargar'
  | 'rae'

export interface AccionMenu {
  id: string
  etiqueta: string
  icono?: IconoAccion
  peligro?: boolean
  deshabilitada?: boolean
  motivo?: string
}

/**
 * Trazos SVG de los iconos de acción. Son cadenas estáticas: no se interpola
 * ningún dato de usuario en el SVG.
 */
const ICONOS: Record<IconoAccion, string> = {
  notas: '<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/>',
  correo:
    '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  formacion:
    '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  desactivar: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
  reactivar:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  quitar:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/>',
  evidencias:
    '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  bloquear:
    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  desbloquear:
    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  borrar:
    '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  programacion:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>',
  criterios:
    '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
  importar:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5-5 5 5"/><path d="M12 5v14"/>',
  descargar:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 4v11"/>',
  rae: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>'
}

function iconoDe(icono?: IconoAccion): string | undefined {
  return icono ? ICONOS[icono] : undefined
}

withDefaults(defineProps<{ acciones: AccionMenu[]; etiqueta?: string }>(), {
  etiqueta: 'Acciones'
})

const emit = defineEmits<{ accion: [id: string] }>()

const abierto = ref(false)
const boton = ref<HTMLButtonElement | null>(null)
const posicion = ref({ top: 0, left: 0 })

function cerrar(): void {
  abierto.value = false
  document.removeEventListener('mousedown', alPulsarFuera)
  document.removeEventListener('keydown', alPulsarTecla)
  window.removeEventListener('scroll', cerrar, true)
  window.removeEventListener('resize', cerrar)
}

function alPulsarFuera(evento: MouseEvent): void {
  const destino = evento.target as HTMLElement | null
  if (destino?.closest('.menu-acciones__popover') || destino === boton.value) return
  cerrar()
}

function alPulsarTecla(evento: KeyboardEvent): void {
  if (evento.key === 'Escape') cerrar()
}

function abrir(): void {
  if (!boton.value) return
  const rect = boton.value.getBoundingClientRect()
  const ancho = 230
  posicion.value = {
    top: rect.bottom + 6,
    left: Math.max(8, Math.min(window.innerWidth - ancho - 8, rect.right - ancho))
  }
  abierto.value = true
  document.addEventListener('mousedown', alPulsarFuera)
  document.addEventListener('keydown', alPulsarTecla)
  window.addEventListener('scroll', cerrar, true)
  window.addEventListener('resize', cerrar)
}

function seleccionar(accion: AccionMenu): void {
  if (accion.deshabilitada) return
  cerrar()
  emit('accion', accion.id)
}

onBeforeUnmount(cerrar)
</script>

<template>
  <div class="menu-acciones">
    <button
      ref="boton"
      class="icono-accion"
      type="button"
      :aria-label="etiqueta"
      :aria-expanded="abierto"
      data-tooltip="Acciones"
      @click.stop="abierto ? cerrar() : abrir()"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="abierto"
        class="menu-acciones__popover"
        role="menu"
        :style="{ top: `${posicion.top}px`, left: `${posicion.left}px` }"
        @click.stop
      >
        <button
          v-for="accion in acciones"
          :key="accion.id"
          class="menu-acciones__item"
          :class="{
            'menu-acciones__item--peligro': accion.peligro,
            'menu-acciones__item--deshabilitada': accion.deshabilitada
          }"
          type="button"
          role="menuitem"
          :disabled="accion.deshabilitada"
          :title="accion.motivo"
          @click="seleccionar(accion)"
        >
          <svg
            v-if="accion.icono"
            class="menu-acciones__icono"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            v-html="iconoDe(accion.icono)"
          ></svg>
          {{ accion.etiqueta }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

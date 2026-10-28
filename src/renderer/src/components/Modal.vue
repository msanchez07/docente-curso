<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

/**
 * Diálogo modal accesible.
 *
 * - Atrapa el foco dentro del panel y lo devuelve al cerrarse.
 * - Se cierra con `Esc` o pulsando el fondo.
 * - Anuncia el título con `aria-labelledby`.
 */
const props = withDefaults(
  defineProps<{
    titulo: string
    ancho?: 'normal' | 'ancho'
    cerrarAlFondo?: boolean
  }>(),
  { ancho: 'normal', cerrarAlFondo: true }
)

const emit = defineEmits<{ cerrar: [] }>()

const idTitulo = useId()
const panel = ref<HTMLElement | null>(null)
let focoAnterior: HTMLElement | null = null

const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function enfocables(): HTMLElement[] {
  if (!panel.value) return []
  return [...panel.value.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE)].filter(
    (elemento) => elemento.offsetParent !== null
  )
}

function cerrar(): void {
  emit('cerrar')
}

function alPulsarTecla(evento: KeyboardEvent): void {
  if (evento.key === 'Escape') {
    evento.preventDefault()
    cerrar()
    return
  }
  if (evento.key !== 'Tab') return

  const elementos = enfocables()
  if (elementos.length === 0) {
    evento.preventDefault()
    panel.value?.focus()
    return
  }

  const primero = elementos[0]
  const ultimo = elementos[elementos.length - 1]
  const activo = document.activeElement as HTMLElement | null

  if (evento.shiftKey && (activo === primero || !panel.value?.contains(activo))) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && activo === ultimo) {
    evento.preventDefault()
    primero.focus()
  }
}

onMounted(() => {
  focoAnterior = document.activeElement as HTMLElement | null
  document.addEventListener('keydown', alPulsarTecla)
  const elementos = enfocables()
  ;(elementos[0] ?? panel.value)?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', alPulsarTecla)
  focoAnterior?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="modal__fondo" @click.self="props.cerrarAlFondo ? cerrar() : undefined">
      <div
        ref="panel"
        class="modal"
        :class="{ 'modal--ancho': props.ancho === 'ancho' }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="idTitulo"
        tabindex="-1"
      >
        <header class="modal__cabecera">
          <h3 :id="idTitulo">{{ props.titulo }}</h3>
          <button class="boton" type="button" @click="cerrar">Cerrar</button>
        </header>
        <div class="modal__cuerpo">
          <slot />
        </div>
        <footer v-if="$slots.pie" class="modal__pie">
          <slot name="pie" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

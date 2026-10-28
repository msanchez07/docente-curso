<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    valor: number | null
    decimales?: number
    sufijo?: string
  }>(),
  { decimales: 0, sufijo: '' }
)

const mostrado = ref(0)
let frame = 0

function animar(desde: number, hasta: number): void {
  cancelAnimationFrame(frame)
  if (typeof window === 'undefined') {
    mostrado.value = hasta
    return
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    mostrado.value = hasta
    return
  }
  const inicio = performance.now()
  const duracion = 650
  const paso = (ahora: number): void => {
    const avance = Math.min(1, (ahora - inicio) / duracion)
    const suavizado = 1 - Math.pow(1 - avance, 3)
    mostrado.value = desde + (hasta - desde) * suavizado
    if (avance < 1) frame = requestAnimationFrame(paso)
  }
  frame = requestAnimationFrame(paso)
}

onMounted(() => {
  if (props.valor !== null) animar(0, props.valor)
})

watch(
  () => props.valor,
  (nuevo, anterior) => {
    if (nuevo === null) return
    animar(anterior ?? 0, nuevo)
  }
)

onUnmounted(() => cancelAnimationFrame(frame))

const texto = computed(() => {
  if (props.valor === null) return '—'
  return mostrado.value.toLocaleString('es-ES', {
    minimumFractionDigits: props.decimales,
    maximumFractionDigits: props.decimales
  })
})
</script>

<template>
  <span>{{ texto }}{{ sufijo }}</span>
</template>

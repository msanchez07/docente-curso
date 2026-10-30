<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { useVolver } from '@renderer/composables/volver'

const props = withDefaults(
  defineProps<{
    /** Destino si no hay una página anterior interna (enlace directo o recarga). */
    a: RouteLocationRaw
    etiqueta?: string
  }>(),
  { etiqueta: 'Volver' }
)

const { volver } = useVolver(() => props.a)
</script>

<template>
  <button class="volver" type="button" :aria-label="etiqueta" :title="etiqueta" @click="volver">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
    <span class="volver__texto">{{ etiqueta }}</span>
  </button>
</template>

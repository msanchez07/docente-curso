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
  <button class="volver" type="button" @click="volver">← {{ etiqueta }}</button>
</template>

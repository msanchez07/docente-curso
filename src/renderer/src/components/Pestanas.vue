<script setup lang="ts">
export interface Pestana {
  id: string
  etiqueta: string
}

const props = withDefaults(defineProps<{ pestanas: Pestana[]; etiqueta?: string }>(), {
  etiqueta: 'Secciones'
})
const activa = defineModel<string>({ required: true })

function mover(delta: number): void {
  const indice = props.pestanas.findIndex((p) => p.id === activa.value)
  const siguiente = (indice + delta + props.pestanas.length) % props.pestanas.length
  activa.value = props.pestanas[siguiente].id
}
</script>

<template>
  <div class="pestanas" role="tablist" :aria-label="etiqueta">
    <button
      v-for="pestana in pestanas"
      :id="`pestana-${pestana.id}`"
      :key="pestana.id"
      class="pestana"
      type="button"
      role="tab"
      :aria-selected="activa === pestana.id"
      :aria-controls="`panel-${pestana.id}`"
      :tabindex="activa === pestana.id ? 0 : -1"
      @click="activa = pestana.id"
      @keydown.left.prevent="mover(-1)"
      @keydown.up.prevent="mover(-1)"
      @keydown.right.prevent="mover(1)"
      @keydown.down.prevent="mover(1)"
    >
      {{ pestana.etiqueta }}
    </button>
  </div>
</template>

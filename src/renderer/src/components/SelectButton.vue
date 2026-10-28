<script setup lang="ts">
export interface OpcionSelectButton {
  value: string
  label: string
}

withDefaults(
  defineProps<{
    opciones: OpcionSelectButton[]
    ariaLabel?: string
    compacto?: boolean
  }>(),
  { ariaLabel: 'Selector', compacto: false }
)

const model = defineModel<string>({ required: false })
</script>

<template>
  <div
    class="select-button"
    :class="{ 'select-button--compacto': compacto }"
    role="group"
    :aria-label="ariaLabel"
  >
    <button
      v-for="opcion in opciones"
      :key="opcion.value"
      class="select-button__item"
      :class="{ 'select-button__item--activo': model === opcion.value }"
      type="button"
      :aria-pressed="model === opcion.value"
      @click="model = opcion.value"
    >
      {{ opcion.label }}
    </button>
  </div>
</template>

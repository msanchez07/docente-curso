<script setup lang="ts">
defineProps<{ etiqueta: string }>()

defineEmits<{
  anterior: []
  siguiente: []
  hoy: []
}>()
</script>

<template>
  <div class="nav-mes">
    <button
      class="nav-mes__boton"
      type="button"
      aria-label="Mes anterior"
      @click="$emit('anterior')"
    >
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
    </button>
    <strong>{{ etiqueta }}</strong>
    <button
      class="nav-mes__boton"
      type="button"
      aria-label="Mes siguiente"
      @click="$emit('siguiente')"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
    <button class="nav-mes__hoy" type="button" @click="$emit('hoy')">Hoy</button>
  </div>
</template>

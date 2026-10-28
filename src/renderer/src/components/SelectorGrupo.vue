<script setup lang="ts">
import { useAppStore } from '@renderer/stores/app'

const store = useAppStore()
</script>

<template>
  <label class="selector">
    <span class="tenue">Grupo</span>
    <select v-model="store.grupoActivo" :disabled="store.grupos.length === 0">
      <option v-if="store.grupos.length === 0" :value="null">— sin grupos —</option>
      <option
        v-for="g in store.grupos"
        :key="g.id"
        :value="g.id"
        :title="`${g.modulo_codigo} · ${g.nombre} (${g.modalidad})`"
      >
        {{ g.modulo_codigo }} · {{ g.nombre }}
      </option>
    </select>
  </label>
</template>

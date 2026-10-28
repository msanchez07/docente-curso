<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

const store = useGruposClaseStore()
const router = useRouter()

onMounted(async () => {
  await store.cargar()
  const primero = store.grupos[0]
  await router.replace(primero ? { name: 'grupo', params: { id: primero.id } } : { name: 'grupos' })
})
</script>

<template>
  <div class="vacio">Cargando…</div>
</template>

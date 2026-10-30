<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ProgramacionTabla from '@renderer/components/ProgramacionTabla.vue'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import type { GrupoClase } from '@shared/tipos'

const route = useRoute()
const store = useGruposClaseStore()
const grupo = ref<GrupoClase | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar()
    const id = Number(route.params.grupoId)
    grupo.value = store.grupo(id)
    if (!grupo.value) error.value = 'No se ha encontrado el grupo.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(() => route.params.grupoId, cargar)
</script>

<template>
  <section class="vista vista--ancha">
    <header class="vista__cabecera">
      <h2>Programación de aula</h2>
      <p v-if="grupo" class="tenue">
        Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }}
      </p>
      <p v-else class="tenue">Vista por grupo.</p>
    </header>

    <div v-if="cargando" class="vacio">Cargando programación…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <ProgramacionTabla v-else-if="grupo" :grupo="grupo" />
  </section>
</template>

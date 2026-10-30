<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import CriteriosTabla from '@renderer/components/CriteriosTabla.vue'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

withDefaults(defineProps<{ embebido?: boolean }>(), { embebido: false })

const route = useRoute()
const store = useGruposClaseStore()
const cargando = ref(true)
const error = ref<string | null>(null)

const id = computed(() => Number(route.params.grupoId))
const grupo = computed(() => store.grupo(id.value))

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar()
    if (!grupo.value) error.value = 'No se ha encontrado el grupo.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(id, cargar)
</script>

<template>
  <section class="vista vista--ancha">
    <header v-if="!embebido" class="vista__cabecera criterios__cabecera">
      <div>
        <h2>Criterios de calificación</h2>
        <p v-if="grupo" class="tenue">
          Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }}
        </p>
      </div>
      <RouterLink to="/plantillas" class="boton">Plantillas</RouterLink>
    </header>
    <header v-else class="seccion__cabecera">
      <div>
        <h3>Criterios de calificación</h3>
        <p class="tenue">Pesos, mínimos y redondeos del grupo.</p>
      </div>
      <RouterLink to="/plantillas" class="boton">Plantillas</RouterLink>
    </header>

    <div v-if="cargando && !grupo" class="vacio">Cargando criterios…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <CriteriosTabla v-else-if="grupo" :grupo="grupo" />
  </section>
</template>

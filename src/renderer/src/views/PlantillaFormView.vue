<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import EditorCriterios from '@renderer/components/EditorCriterios.vue'
import type { ModeloEvaluacion, PlantillaCriterios } from '@shared/tipos'

const route = useRoute()
const plantilla = ref<PlantillaCriterios | null>(null)
const modelo = ref<ModeloEvaluacion | null>(null)
const valido = ref(false)
const cargando = ref(true)
const guardando = ref(false)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)

const id = computed(() => Number(route.params.plantillaId))

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    const lista = await window.api.criterios.listarPlantillas()
    plantilla.value = lista.find((item) => item.id === id.value) ?? null
    if (!plantilla.value) {
      error.value = 'No se ha encontrado la plantilla.'
      return
    }
    modelo.value = await window.api.criterios.obtenerPlantilla(id.value)
    if (!modelo.value) error.value = 'No se ha podido cargar el contenido de la plantilla.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

async function guardar(): Promise<void> {
  if (!modelo.value || !valido.value || !plantilla.value) return
  guardando.value = true
  error.value = null
  mensaje.value = null
  try {
    await window.api.criterios.guardarPlantilla(plantilla.value.id, modelo.value)
    mensaje.value = 'Plantilla guardada.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver a="/plantillas" />

    <div v-if="cargando" class="vacio">Cargando plantilla…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="plantilla && modelo">
      <header class="vista__cabecera criterios__cabecera">
        <div>
          <h2>{{ plantilla.nombre }}</h2>
          <p class="tenue">
            Módulo {{ plantilla.modulo_codigo }} · {{ plantilla.modalidad }}
          </p>
        </div>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="!valido || guardando"
          @click="guardar"
        >
          {{ guardando ? 'Guardando…' : 'Guardar plantilla' }}
        </button>
      </header>

      <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>
      <EditorCriterios :modelo="modelo" @valido="valido = $event" />
    </template>
  </section>
</template>

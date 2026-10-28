<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import HorarioSemanal from '@renderer/components/HorarioSemanal.vue'
import { etiquetaModalidad } from '@shared/grupos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import type { GrupoClase } from '@shared/tipos'

const route = useRoute()
const store = useGruposClaseStore()
const grupo = ref<GrupoClase | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

const id = computed(() => Number(route.params.grupoId))
const hayHorario = computed(() =>
  Object.values(grupo.value?.bloques_semana ?? {}).some((bloques) => bloques.length > 0)
)

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar()
    grupo.value = store.grupo(id.value)
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
    <BotonVolver :a="grupo ? { name: 'grupo', params: { id: grupo.id } } : '/grupos'" />

    <div v-if="cargando" class="vacio">Cargando horario…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="grupo">
      <header class="vista__cabecera">
        <h2>Horario semanal</h2>
        <p class="tenue">
          Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }} ·
          {{ etiquetaModalidad(grupo.modalidad) }}
        </p>
      </header>

      <div class="tarjeta">
        <header class="dashboard__tarjeta-cabecera">
          <div>
            <h3>{{ grupo.modulo_siglas }} · bloques de 55 minutos</h3>
            <p class="tenue">
              Mañana de 08:00 a 14:00 y tarde de 14:40 a 21:05, con sus recreos. La columna de hoy
              aparece resaltada.
            </p>
          </div>
          <RouterLink to="/grupos" class="dashboard__enlace">Editar en el grupo</RouterLink>
        </header>

        <HorarioSemanal
          v-if="hayHorario"
          :bloques="grupo.bloques_semana"
          :modalidad="grupo.modalidad"
        />
        <p v-else class="tenue">
          Este grupo todavía no tiene bloques configurados.
          <RouterLink to="/grupos">Configura el horario en el formulario del grupo</RouterLink>.
        </p>
      </div>
    </template>
  </section>
</template>

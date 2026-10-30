<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SelectButton from '@renderer/components/SelectButton.vue'
import UnidadesProgramacion from '@renderer/components/UnidadesProgramacion.vue'
import CalendarioEscolarPanel from '@renderer/components/CalendarioEscolarPanel.vue'
import PresentacionModulo from '@renderer/components/PresentacionModulo.vue'
import BoeView from '@renderer/views/BoeView.vue'
import CriteriosView from '@renderer/views/CriteriosView.vue'
import EventosEvaluacionView from '@renderer/views/EventosEvaluacionView.vue'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import type { GrupoClase } from '@shared/tipos'

const route = useRoute()
const router = useRouter()
const store = useGruposClaseStore()
const grupo = ref<GrupoClase | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)
const pestana = ref('unidades')

const opciones = [
  { value: 'unidades', label: 'Unidades' },
  { value: 'fechas', label: 'Fechas' },
  { value: 'criterios', label: 'Criterios' },
  { value: 'rae', label: 'RA/CE' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'presentacion', label: 'Presentación' }
]

const id = computed(() => Number(route.params.grupoId))

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

onMounted(() => {
  const tab = String(route.query.tab ?? '')
  if (opciones.some((opcion) => opcion.value === tab)) pestana.value = tab
  void cargar()
})

watch(id, cargar)

watch(
  () => route.query.tab,
  (tab) => {
    const valor = String(tab ?? '')
    if (opciones.some((opcion) => opcion.value === valor)) pestana.value = valor
  }
)

watch(pestana, (valor) => {
  if (route.query.tab === valor) return
  void router.replace({ query: { ...route.query, tab: valor } })
})
</script>

<template>
  <section class="vista vista--ancha">
    <header class="vista__cabecera">
      <h2>Programación didáctica</h2>
      <p v-if="grupo" class="tenue">
        Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }} · unidades, fechas, criterios
        y RA/CE
      </p>
    </header>

    <div class="informe__controles">
      <SelectButton v-model="pestana" :opciones="opciones" aria-label="Sección" compacto />
      <span class="barra__espacio"></span>
      <span class="tenue">Documento de planificación del grupo</span>
    </div>

    <div v-if="cargando && !grupo" class="vacio">Cargando programación didáctica…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="grupo">
      <UnidadesProgramacion v-if="pestana === 'unidades'" :grupo="grupo" />
      <EventosEvaluacionView v-else-if="pestana === 'fechas'" embebido />
      <CriteriosView v-else-if="pestana === 'criterios'" embebido />
      <BoeView v-else-if="pestana === 'rae'" embebido />
      <CalendarioEscolarPanel
        v-else-if="pestana === 'calendario'"
        :curso-academico-id="grupo.curso_academico_id"
        :grupo-clase-id="grupo.id"
      />
      <PresentacionModulo v-else-if="pestana === 'presentacion'" :grupo="grupo" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import type { CriterioDisponible, EntregaClase, GrupoClase } from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

withDefaults(defineProps<{ embebido?: boolean }>(), { embebido: false })

const route = useRoute()
const store = useGruposClaseStore()
const grupo = ref<GrupoClase | null>(null)
const criterios = ref<CriterioDisponible[]>([])
const entregas = ref<EntregaClase[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const busqueda = ref('')

const id = computed(() => Number(route.params.grupoId))

const cobertura = computed(() => {
  const mapa = new Map<number, string[]>()
  for (const entrega of entregas.value) {
    for (const ceId of entrega.ce_ids) {
      const lista = mapa.get(ceId) ?? []
      lista.push(entrega.titulo)
      mapa.set(ceId, lista)
    }
  }
  return mapa
})

const agrupados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()
  const mapa = new Map<
    string,
    { raCodigo: string; raDescripcion: string; ce: CriterioDisponible[] }
  >()
  for (const ce of criterios.value) {
    if (
      termino &&
      !`${ce.ceCodigo} ${ce.descripcion} ${ce.raCodigo} ${ce.raDescripcion}`
        .toLowerCase()
        .includes(termino)
    ) {
      continue
    }
    const entrada = mapa.get(ce.raCodigo) ?? {
      raCodigo: ce.raCodigo,
      raDescripcion: ce.raDescripcion,
      ce: []
    }
    entrada.ce.push(ce)
    mapa.set(ce.raCodigo, entrada)
  }
  return [...mapa.values()]
})

const cubiertos = computed(
  () => criterios.value.filter((ce) => (cobertura.value.get(ce.ceId) ?? []).length > 0).length
)

const porcentaje = computed(() =>
  criterios.value.length === 0 ? 0 : Math.round((cubiertos.value / criterios.value.length) * 100)
)

const raSeleccionado = ref<string | null>(null)

const raActual = computed(() => {
  const lista = agrupados.value
  return lista.find((ra) => ra.raCodigo === raSeleccionado.value) ?? lista[0] ?? null
})

watch(agrupados, (lista) => {
  if (lista.length === 0) {
    raSeleccionado.value = null
    return
  }
  if (!lista.some((ra) => ra.raCodigo === raSeleccionado.value)) {
    raSeleccionado.value = lista[0].raCodigo
  }
})

function seleccionarRa(codigo: string): void {
  raSeleccionado.value = codigo
}

function coberturaRa(ra: { ce: CriterioDisponible[] }): {
  cubiertos: number
  total: number
  porcentaje: number
} {
  const total = ra.ce.length
  const cubiertosRa = ra.ce.filter((ce) => (cobertura.value.get(ce.ceId) ?? []).length > 0).length
  return {
    cubiertos: cubiertosRa,
    total,
    porcentaje: total === 0 ? 0 : Math.round((cubiertosRa / total) * 100)
  }
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar()
    grupo.value = store.grupo(id.value)
    if (!grupo.value) {
      error.value = 'No se ha encontrado el grupo.'
      return
    }
    criterios.value = await window.api.entregasClase.criterios(grupo.value.id)
    entregas.value = await window.api.entregasClase.listar(grupo.value.id)
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
    <BotonVolver
      v-if="!embebido"
      :a="grupo ? { name: 'grupo', params: { id: grupo.id } } : '/grupos'"
    />

    <header v-if="!embebido" class="vista__cabecera">
      <h2>BOE · RA y CE</h2>
      <p v-if="grupo" class="tenue">
        Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }} · {{ grupo.modulo_nombre }}
      </p>
    </header>
    <header v-else class="seccion__cabecera">
      <div>
        <h3>Resultados de aprendizaje y criterios</h3>
        <p class="tenue">Cobertura de RA/CE a partir de las entregas del grupo.</p>
      </div>
    </header>

    <div v-if="cargando && !grupo" class="vacio">Cargando RA/CE…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="grupo">
      <div class="tarjeta">
        <div class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Cobertura</h3>
            <span class="tenue">
              {{ cubiertos }} de {{ criterios.length }} CE cubiertos por entregas
            </span>
          </div>
          <div class="cabecera-criterios__acciones">
            <span class="chip chip--ok">{{ agrupados.length }} RA</span>
            <span class="chip">{{ criterios.length }} CE</span>
            <span class="chip" :class="porcentaje === 100 ? 'chip--ok' : 'chip--aviso'">
              {{ porcentaje }} % cubierto
            </span>
            <input v-model="busqueda" type="search" placeholder="Buscar RA/CE…" />
          </div>
        </div>

        <div v-if="agrupados.length === 0" class="vacio">
          No hay criterios que coincidan con la búsqueda.
        </div>

        <div v-else class="boe__layout">
          <aside class="tarjeta boe__indice" aria-label="Resultados de aprendizaje">
            <header class="boe__indice-cabecera">
              <h4>Resultados de aprendizaje</h4>
              <span class="tenue">{{ agrupados.length }} RA</span>
            </header>
            <button
              v-for="ra in agrupados"
              :key="ra.raCodigo"
              class="boe__ra"
              :class="{ 'boe__ra--activo': raActual?.raCodigo === ra.raCodigo }"
              type="button"
              @click="seleccionarRa(ra.raCodigo)"
            >
              <span class="boe__ra-codigo">{{ ra.raCodigo }}</span>
              <span class="boe__ra-descripcion">{{ ra.raDescripcion }}</span>
              <span class="boe__ra-meta">
                <span>{{ ra.ce.length }} CE</span>
                <span
                  class="chip"
                  :class="coberturaRa(ra).porcentaje === 100 ? 'chip--ok' : 'chip--aviso'"
                >
                  {{ coberturaRa(ra).porcentaje }} %
                </span>
              </span>
            </button>
          </aside>

          <section v-if="raActual" class="tarjeta boe__detalle">
            <header class="boe__detalle-cabecera">
              <div>
                <span class="codigo">{{ raActual.raCodigo }}</span>
                <h3>{{ raActual.raDescripcion }}</h3>
              </div>
              <span
                class="chip"
                :class="coberturaRa(raActual).porcentaje === 100 ? 'chip--ok' : 'chip--aviso'"
              >
                {{ coberturaRa(raActual).cubiertos }} de {{ raActual.ce.length }} CE
              </span>
            </header>

            <div class="tabla-scroll">
              <table class="tabla boe__tabla">
                <thead>
                  <tr>
                    <th scope="col">CE</th>
                    <th scope="col">Descripción</th>
                    <th scope="col">Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ce in raActual.ce" :key="ce.ceId">
                    <td class="monospace">{{ ce.ceCodigo }})</td>
                    <td>{{ ce.descripcion }}</td>
                    <td>
                      <span
                        v-if="(cobertura.get(ce.ceId) ?? []).length === 0"
                        class="chip chip--aviso"
                      >
                        Sin cubrir
                      </span>
                      <div v-else class="chips">
                        <span
                          v-for="titulo in cobertura.get(ce.ceId) ?? []"
                          :key="titulo"
                          class="chip chip--ok"
                        >
                          {{ titulo }}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </template>
  </section>
</template>

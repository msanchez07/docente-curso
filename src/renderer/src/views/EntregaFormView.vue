<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import type {
  ArchivoRubrica,
  CriterioDisponible,
  EntregaClase,
  EntregaClaseEntrada,
  GrupoClase,
  ModeloEvaluacion,
  UnidadProgramacion
} from '@shared/tipos'
import { cursoAcademicoActual } from '@shared/curso-academico'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import { useCursosAcademicosStore } from '@renderer/stores/cursos-academicos'
import {
  abrirArchivoRubrica,
  leerRubricaDeFichero,
  tamanoBase64,
  tamanoLegible
} from '@renderer/utils/archivos'

interface FormEntrega {
  titulo: string
  descripcion: string
  tipo: string
  fecha_limite: string
  rubrica: string
  rubrica_archivo: ArchivoRubrica | null
  avaluacion_id: string
  categoria_id: string
  unidad_id: number | null
  ce_ids: number[]
}

interface GrupoCe {
  raCodigo: string
  raDescripcion: string
  ce: CriterioDisponible[]
}

const route = useRoute()
const router = useRouter()
const store = useGruposClaseStore()
const cursosStore = useCursosAcademicosStore()

const grupo = ref<GrupoClase | null>(null)
const criterios = ref<ModeloEvaluacion | null>(null)
const unidades = ref<UnidadProgramacion[]>([])
const disponibles = ref<CriterioDisponible[]>([])
const entrega = ref<EntregaClase | null>(null)
const cargando = ref(true)
const guardando = ref(false)
const errorCarga = ref<string | null>(null)
const errorFormulario = ref<string | null>(null)
const busquedaCe = ref('')
const ficheroRubrica = ref<HTMLInputElement | null>(null)

const form = reactive<FormEntrega>({
  titulo: '',
  descripcion: '',
  tipo: 'tarea',
  fecha_limite: '',
  rubrica: '',
  rubrica_archivo: null,
  avaluacion_id: '',
  categoria_id: '',
  unidad_id: null,
  ce_ids: []
})

const grupoId = computed(() => Number(route.params.grupoId))
const entregaId = computed(() => Number(route.params.entregaId))
const esEdicion = computed(() => route.name === 'entrega-editar')
const sinCriterios = computed(() => !cargando.value && !errorCarga.value && !criterios.value)
const entregaBloqueada = computed(() => entrega.value?.bloqueada === true)

const cursoFormulario = computed(() => {
  if (esEdicion.value && grupo.value) return grupo.value.curso_academico_nombre
  return cursosStore.actual?.nombre ?? cursoAcademicoActual().nombre
})

const unidadSeleccionada = computed(
  () => unidades.value.find((unidad) => unidad.id === form.unidad_id) ?? null
)

const categoriasDisponibles = computed(() => {
  const propias = unidadSeleccionada.value?.categorias ?? []
  return propias.length > 0 ? propias : (criterios.value?.categorias ?? [])
})

function alCambiarUnidad(): void {
  form.categoria_id = categoriasDisponibles.value[0]?.id ?? ''
}

const ceAgrupados = computed<GrupoCe[]>(() => {
  const mapa = new Map<string, GrupoCe>()
  for (const ce of disponibles.value) {
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

const resultadosCe = computed(() => {
  const termino = busquedaCe.value.trim().toLowerCase()
  if (!termino) return []
  return disponibles.value.filter((ce) =>
    `${ce.ceCodigo} ${ce.descripcion} ${ce.raCodigo} ${ce.raDescripcion}`
      .toLowerCase()
      .includes(termino)
  )
})

const ceSeleccionados = computed(() => {
  const mapa = new Map(disponibles.value.map((ce) => [ce.ceId, ce]))
  return form.ce_ids.map((id) => mapa.get(id)).filter((ce): ce is CriterioDisponible => Boolean(ce))
})

const avaluacionSeleccionada = computed(
  () =>
    criterios.value?.avaluaciones.find((avaluacion) => avaluacion.id === form.avaluacion_id)
      ?.nombre ?? '—'
)

const categoriaSeleccionada = computed(
  () =>
    criterios.value?.categorias.find((categoria) => categoria.id === form.categoria_id)?.nombre ??
    '—'
)

const estadoRubrica = computed(() => {
  const tieneTexto = Boolean(form.rubrica.trim())
  const tieneArchivo = Boolean(form.rubrica_archivo)
  if (tieneTexto && tieneArchivo) return 'Texto + archivo'
  if (tieneArchivo) return 'Archivo adjunto'
  if (tieneTexto) return 'Texto'
  return 'Sin rúbrica'
})

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function etiquetaTipo(tipo: string): string {
  const etiquetas: Record<string, string> = {
    tarea: 'Tarea',
    practica: 'Práctica',
    examen: 'Examen',
    proyecto: 'Proyecto'
  }
  return etiquetas[tipo] ?? tipo
}

function contarSeleccionadosRa(ra: GrupoCe): number {
  return ra.ce.filter((ce) => form.ce_ids.includes(ce.ceId)).length
}

function alternarCe(ceId: number): void {
  if (form.ce_ids.includes(ceId)) {
    form.ce_ids = form.ce_ids.filter((idCe) => idCe !== ceId)
  } else {
    form.ce_ids = [...form.ce_ids, ceId]
  }
}

function seleccionarRa(ra: GrupoCe, seleccionar: boolean): void {
  const ids = ra.ce.map((ce) => ce.ceId)
  if (seleccionar) {
    form.ce_ids = [...new Set([...form.ce_ids, ...ids])]
  } else {
    form.ce_ids = form.ce_ids.filter((id) => !ids.includes(id))
  }
}

function quitarCe(ceId: number): void {
  form.ce_ids = form.ce_ids.filter((id) => id !== ceId)
}

function limpiarCe(): void {
  form.ce_ids = []
}

async function alElegirRubrica(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  errorFormulario.value = null
  try {
    form.rubrica_archivo = await leerRubricaDeFichero(file)
  } catch (e) {
    errorFormulario.value = (e as Error).message ?? String(e)
  }
}

function quitarArchivoRubrica(): void {
  form.rubrica_archivo = null
}

function resetFormulario(): void {
  form.titulo = ''
  form.descripcion = ''
  form.tipo = 'tarea'
  form.fecha_limite = ''
  form.rubrica = ''
  form.rubrica_archivo = null
  form.avaluacion_id = ''
  form.categoria_id = ''
  form.unidad_id = null
  form.ce_ids = []
}

function rellenarFormulario(datos: EntregaClase): void {
  form.titulo = datos.titulo
  form.descripcion = datos.descripcion ?? ''
  form.tipo = datos.tipo
  form.fecha_limite = datos.fecha_limite ?? ''
  form.rubrica = datos.rubrica ?? ''
  form.rubrica_archivo = datos.rubrica_archivo
  form.avaluacion_id = datos.avaluacion_id
  form.categoria_id = datos.categoria_id
  form.unidad_id = datos.unidad_id
  form.ce_ids = [...datos.ce_ids]
}

async function cargar(): Promise<void> {
  cargando.value = true
  errorCarga.value = null
  errorFormulario.value = null
  entrega.value = null
  busquedaCe.value = ''
  resetFormulario()
  try {
    await Promise.all([store.cargar(), cursosStore.cargar()])
    grupo.value = store.grupo(grupoId.value)
    if (!grupo.value) {
      errorCarga.value = 'No se ha encontrado el grupo.'
      return
    }

    criterios.value = await window.api.criterios.obtener(grupo.value.id)
    if (!criterios.value) return

    disponibles.value = await window.api.entregasClase.criterios(grupo.value.id)
    unidades.value = await window.api.unidadesProgramacion.listar(grupo.value.id)

    if (esEdicion.value) {
      const entregas = await window.api.entregasClase.listar(grupo.value.id)
      entrega.value = entregas.find((item) => item.id === entregaId.value) ?? null
      if (!entrega.value) {
        errorCarga.value = 'No se ha encontrado la entrega.'
        return
      }
      if (entrega.value.bloqueada) return
      rellenarFormulario(entrega.value)
      return
    }

    const avaluacionQuery = String(route.query.avaluacion ?? '')
    const avaluacion =
      criterios.value.avaluaciones.find((item) => item.id === avaluacionQuery) ??
      criterios.value.avaluaciones[0]
    form.avaluacion_id = avaluacion?.id ?? ''
    form.categoria_id = criterios.value.categorias[0]?.id ?? ''
    form.unidad_id = null
    form.ce_ids = []
  } catch (e) {
    errorCarga.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch([grupoId, entregaId, esEdicion], cargar)

async function guardar(): Promise<void> {
  if (!grupo.value) return
  errorFormulario.value = null
  if (form.unidad_id === null) {
    errorFormulario.value = 'Selecciona la unidad didáctica a la que pertenece la entrega.'
    return
  }
  if (!form.rubrica.trim() && !form.rubrica_archivo) {
    errorFormulario.value =
      'Añade una rúbrica: escribe los criterios o adjunta un archivo con ellos.'
    return
  }

  guardando.value = true
  try {
    const datos: EntregaClaseEntrada = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      tipo: form.tipo,
      fecha_limite: form.fecha_limite || null,
      rubrica: form.rubrica.trim() || null,
      rubrica_archivo: form.rubrica_archivo,
      avaluacion_id: form.avaluacion_id,
      categoria_id: form.categoria_id,
      unidad_id: form.unidad_id,
      ce_ids: [...form.ce_ids]
    }

    if (esEdicion.value) {
      await window.api.entregasClase.actualizar(entregaId.value, datos)
    } else {
      await window.api.entregasClase.crear(grupo.value.id, datos)
    }

    await router.push({ name: 'entregas', params: { grupoId: grupo.value.id } })
  } catch (e) {
    errorFormulario.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver :a="grupo ? { name: 'entregas', params: { grupoId: grupo.id } } : '/grupos'" />

    <header class="entrega-form__cabecera">
      <div>
        <h2>{{ esEdicion ? 'Editar entrega' : 'Nueva entrega' }}</h2>
        <p v-if="grupo" class="tenue">Curso {{ cursoFormulario }} · {{ grupo.nombre }}</p>
      </div>
      <div class="entrega-form__acciones-cabecera">
        <RouterLink
          class="boton"
          :to="grupo ? { name: 'entregas', params: { grupoId: grupo.id } } : '/grupos'"
        >
          Cancelar
        </RouterLink>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="guardando || !form.titulo.trim() || !form.avaluacion_id || !form.categoria_id"
          @click="guardar"
        >
          {{ guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear entrega' }}
        </button>
      </div>
    </header>

    <div v-if="cargando" class="vacio">Cargando formulario…</div>
    <p v-else-if="errorCarga" class="aviso aviso--error" role="alert">{{ errorCarga }}</p>

    <div v-else-if="sinCriterios" class="tarjeta">
      <h3>Primero, los criterios</h3>
      <p class="tenue">
        Las entregas se ubican en una avaluación y una categoría. Define los criterios de
        calificación del grupo antes de crearlas.
      </p>
      <RouterLink
        class="boton boton--principal"
        :to="{ name: 'criterios', params: { grupoId: grupo?.id } }"
      >
        Ir a criterios
      </RouterLink>
    </div>

    <div v-else-if="entregaBloqueada" class="tarjeta">
      <h3>Entrega bloqueada</h3>
      <p class="tenue">
        «{{ entrega?.titulo }}» está bloqueada. Desbloquéala desde la lista de entregas para poder
        editar sus datos.
      </p>
      <RouterLink
        class="boton boton--principal"
        :to="{ name: 'entregas', params: { grupoId: grupo?.id } }"
      >
        Volver a entregas
      </RouterLink>
    </div>

    <template v-else-if="grupo && criterios">
      <div class="entrega-form__grid">
        <div class="entrega-form__principal">
          <p v-if="errorFormulario" class="aviso aviso--error" role="alert">
            {{ errorFormulario }}
          </p>

          <section class="tarjeta">
            <header class="entrega-form__seccion-cabecera">
              <div>
                <h3>Datos de la entrega</h3>
                <p class="tenue">Lo que verá el grupo en el listado de entregas.</p>
              </div>
            </header>

            <div class="formulario">
              <div class="campo campo--ancho">
                <label for="entrega-titulo">Título *</label>
                <input
                  id="entrega-titulo"
                  v-model="form.titulo"
                  placeholder="Práctica 1: formulario"
                />
              </div>

              <div class="campo campo--ancho">
                <label for="entrega-descripcion">Descripción</label>
                <textarea
                  id="entrega-descripcion"
                  v-model="form.descripcion"
                  rows="2"
                  placeholder="Qué tiene que hacer el alumnado…"
                ></textarea>
              </div>

              <div class="campo">
                <label for="entrega-tipo">Tipo</label>
                <select id="entrega-tipo" v-model="form.tipo">
                  <option value="tarea">Tarea</option>
                  <option value="practica">Práctica</option>
                  <option value="examen">Examen</option>
                  <option value="proyecto">Proyecto</option>
                </select>
              </div>

              <div class="campo">
                <label for="entrega-fecha">Fecha límite</label>
                <input id="entrega-fecha" v-model="form.fecha_limite" type="date" />
              </div>

              <div class="campo">
                <label for="entrega-categoria">Categoría *</label>
                <select id="entrega-categoria" v-model="form.categoria_id">
                  <option v-for="cat in categoriasDisponibles" :key="cat.id" :value="cat.id">
                    {{ cat.nombre }}
                  </option>
                </select>
              </div>

              <div class="campo">
                <label for="entrega-unidad">
                  Unidad didáctica
                  <template v-if="criterios.modoCalificacion === 'unidades'"> *</template>
                </label>
                <select id="entrega-unidad" v-model="form.unidad_id" @change="alCambiarUnidad">
                  <option :value="null">Sin asignar</option>
                  <option v-for="unidad in unidades" :key="unidad.id" :value="unidad.id">
                    {{ unidad.codigo ? `${unidad.codigo} · ` : '' }}{{ unidad.nombre }}
                  </option>
                </select>
              </div>
            </div>
          </section>

          <section class="tarjeta">
            <header class="entrega-form__seccion-cabecera">
              <div>
                <h3>Rúbrica</h3>
                <p class="tenue">Escribe los criterios o adjunta el documento. Es obligatoria.</p>
              </div>
              <span
                class="chip"
                :class="estadoRubrica === 'Sin rúbrica' ? 'chip--aviso' : 'chip--ok'"
              >
                {{ estadoRubrica }}
              </span>
            </header>

            <div class="campo campo--ancho">
              <label for="entrega-rubrica">Criterios y niveles</label>
              <textarea
                id="entrega-rubrica"
                v-model="form.rubrica"
                rows="5"
                placeholder="Criterios, niveles, puntuaciones…"
              ></textarea>
            </div>

            <div class="rubrica-archivo">
              <button class="boton boton--sutil" type="button" @click="ficheroRubrica?.click()">
                Adjuntar archivo…
              </button>
              <input
                ref="ficheroRubrica"
                class="visualmente-oculto"
                type="file"
                accept=".pdf,.doc,.docx,.odt,.txt,.md,.rtf,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/*"
                @change="alElegirRubrica"
              />

              <div v-if="form.rubrica_archivo" class="rubrica-archivo__actual">
                <span class="monospace">{{ form.rubrica_archivo.nombre }}</span>
                <span class="tenue">
                  {{ tamanoLegible(tamanoBase64(form.rubrica_archivo.datos)) }}
                </span>
                <button
                  class="boton boton--sutil"
                  type="button"
                  @click="abrirArchivoRubrica(form.rubrica_archivo)"
                >
                  Abrir
                </button>
                <button class="boton boton--sutil" type="button" @click="quitarArchivoRubrica">
                  Quitar
                </button>
              </div>
              <span v-else class="tenue">PDF, DOCX, imagen o texto. Máximo 4 MB.</span>
            </div>
          </section>

          <section class="tarjeta">
            <header class="entrega-form__seccion-cabecera">
              <div>
                <h3>RA/CE que evalúa</h3>
                <p class="tenue">Selecciona los criterios del BOE que cubre esta entrega.</p>
              </div>
              <div class="entrega-form__ce-contador">
                <span class="chip">{{ form.ce_ids.length }} seleccionados</span>
                <button
                  v-if="form.ce_ids.length > 0"
                  class="boton boton--sutil"
                  type="button"
                  @click="limpiarCe"
                >
                  Limpiar
                </button>
              </div>
            </header>

            <div v-if="ceSeleccionados.length > 0" class="entrega-form__seleccionados">
              <span
                v-for="ce in ceSeleccionados"
                :key="ce.ceId"
                class="chip chip--ok entrega-form__ce-chip"
              >
                {{ ce.ceCodigo }}
                <button
                  class="entrega-form__quitar"
                  type="button"
                  :aria-label="`Quitar ${ce.ceCodigo}`"
                  @click="quitarCe(ce.ceId)"
                >
                  ×
                </button>
              </span>
            </div>

            <div class="entrega-form__buscador">
              <input
                v-model="busquedaCe"
                type="search"
                placeholder="Buscar por código o descripción…"
              />
            </div>

            <div class="entrega-form__ce-lista">
              <div v-if="busquedaCe.trim()" class="entrega-form__resultados">
                <p v-if="resultadosCe.length === 0" class="tenue">
                  No hay criterios que coincidan.
                </p>
                <label v-for="ce in resultadosCe" :key="ce.ceId" class="entrega-form__ce-fila">
                  <input
                    type="checkbox"
                    :checked="form.ce_ids.includes(ce.ceId)"
                    @change="alternarCe(ce.ceId)"
                  />
                  <span class="monospace">{{ ce.raCodigo }} {{ ce.ceCodigo }})</span>
                  <span>{{ ce.descripcion }}</span>
                </label>
              </div>

              <div v-else class="entrega-form__ra-lista">
                <details v-for="ra in ceAgrupados" :key="ra.raCodigo" class="entrega-form__ra">
                  <summary>
                    <span class="codigo">{{ ra.raCodigo }}</span>
                    <span class="entrega-form__ra-descripcion">{{ ra.raDescripcion }}</span>
                    <span class="chip"> {{ contarSeleccionadosRa(ra) }} / {{ ra.ce.length }} </span>
                  </summary>
                  <div class="entrega-form__ra-cuerpo">
                    <div class="entrega-form__ra-acciones">
                      <button
                        class="boton boton--sutil"
                        type="button"
                        @click="seleccionarRa(ra, true)"
                      >
                        Seleccionar RA
                      </button>
                      <button
                        class="boton boton--sutil"
                        type="button"
                        @click="seleccionarRa(ra, false)"
                      >
                        Quitar RA
                      </button>
                    </div>
                    <label v-for="ce in ra.ce" :key="ce.ceId" class="entrega-form__ce-fila">
                      <input
                        type="checkbox"
                        :checked="form.ce_ids.includes(ce.ceId)"
                        @change="alternarCe(ce.ceId)"
                      />
                      <span class="monospace">{{ ce.ceCodigo }})</span>
                      <span>{{ ce.descripcion }}</span>
                    </label>
                  </div>
                </details>
              </div>
            </div>
          </section>
        </div>

        <aside class="entrega-form__lateral">
          <section class="tarjeta">
            <h3>Resumen</h3>
            <dl class="entrega-form__resumen">
              <div>
                <dt>Curso académico</dt>
                <dd>{{ cursoFormulario }}</dd>
              </div>
              <div>
                <dt>Avaluación</dt>
                <dd>{{ avaluacionSeleccionada }}</dd>
              </div>
              <div>
                <dt>Categoría</dt>
                <dd>{{ categoriaSeleccionada }}</dd>
              </div>
              <div>
                <dt>Unidad</dt>
                <dd>
                  {{
                    unidades.find((unidad) => unidad.id === form.unidad_id)?.codigo ?? 'Sin asignar'
                  }}
                </dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{{ etiquetaTipo(form.tipo) }}</dd>
              </div>
              <div>
                <dt>Fecha límite</dt>
                <dd>
                  {{ form.fecha_limite ? formatearFecha(form.fecha_limite) : 'Sin fecha' }}
                </dd>
              </div>
              <div>
                <dt>Rúbrica</dt>
                <dd>{{ estadoRubrica }}</dd>
              </div>
              <div>
                <dt>RA/CE</dt>
                <dd>{{ form.ce_ids.length }} seleccionados</dd>
              </div>
            </dl>
          </section>

          <section class="tarjeta entrega-form__acciones-lateral">
            <p class="tenue">
              Las soluciones, apuntes y demás documentos se añaden después desde
              <strong>Evidencias</strong>.
            </p>
            <button
              class="boton boton--principal"
              type="button"
              :disabled="
                guardando || !form.titulo.trim() || !form.avaluacion_id || !form.categoria_id
              "
              @click="guardar"
            >
              {{ guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear entrega' }}
            </button>
            <RouterLink
              class="boton"
              :to="grupo ? { name: 'entregas', params: { grupoId: grupo.id } } : '/grupos'"
            >
              Cancelar
            </RouterLink>
            <p v-if="errorFormulario" class="aviso aviso--error" role="alert">
              {{ errorFormulario }}
            </p>
          </section>
        </aside>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { calcularResumenClase } from '@shared/calcular-calificaciones'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import SelectButton from '@renderer/components/SelectButton.vue'
import type {
  AvaluacionCalificacion,
  FilaCalificacionClase,
  GrupoClase,
  ResumenCalificacionesClase
} from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

const route = useRoute()
const store = useGruposClaseStore()

const grupo = ref<GrupoClase | null>(null)
const resumen = ref<ResumenCalificacionesClase | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)
const busqueda = ref('')
const seleccionadoId = ref<number | null>(null)
const avaluacionActiva = ref('')
const exportandoInforme = ref(false)
const errorGuardado = ref<string | null>(null)
const mensaje = ref<string | null>(null)

const id = computed(() => Number(route.params.grupoId))

const descripcionModelo = computed(() => {
  if (!resumen.value) return ''
  const modelo = resumen.value.modelo
  const categorias = modelo.categorias.map((c) => `${c.nombre} ${c.peso} %`).join(' + ')
  return `${categorias} · nota final ponderada por RA`
})

const modoUnidades = computed(() => false)

const alumnosFiltrados = computed(() => {
  if (!resumen.value) return []
  const termino = busqueda.value.trim().toLowerCase()
  if (!termino) return resumen.value.alumnos
  return resumen.value.alumnos.filter((fila) =>
    `${fila.alumno.nombre} ${fila.alumno.apellidos} ${fila.alumno.dni ?? ''}`
      .toLowerCase()
      .includes(termino)
  )
})

const filaSeleccionada = computed<FilaCalificacionClase | null>(() => {
  if (!resumen.value) return null
  return (
    resumen.value.alumnos.find((fila) => fila.alumno.id === seleccionadoId.value) ??
    resumen.value.alumnos[0] ??
    null
  )
})

const avaluacionSeleccionada = computed<AvaluacionCalificacion | null>(() => {
  const fila = filaSeleccionada.value
  if (!fila || avaluacionActiva.value === 'final' || avaluacionActiva.value.startsWith('u:')) {
    return null
  }
  return (
    fila.avaluaciones.find((avaluacion) => avaluacion.avaluacionId === avaluacionActiva.value) ??
    null
  )
})

const unidadSeleccionada = computed(() => {
  if (!modoUnidades.value || !avaluacionActiva.value.startsWith('u:')) return null
  const id = Number(avaluacionActiva.value.slice(2))
  return filaSeleccionada.value?.unidades.find((unidad) => unidad.unidadId === id) ?? null
})

const opcionesAvaluaciones = computed(() => {
  const fila = filaSeleccionada.value
  if (!fila) return [{ value: 'final', label: 'Nota final' }]
  const evaluaciones = modoUnidades.value
    ? fila.unidades.map((unidad) => ({
        value: `u:${unidad.unidadId}`,
        label: `${unidad.codigo ?? unidad.nombre} · ${formato(unidad.nota)}`
      }))
    : fila.avaluaciones.map((avaluacion) => ({
        value: avaluacion.avaluacionId,
        label: `${avaluacion.nombre} · ${formato(avaluacion.nota)}`
      }))
  return [...evaluaciones, { value: 'final', label: 'Nota final' }]
})

const formulaFinal = computed(() => {
  const fila = filaSeleccionada.value
  const modelo = resumen.value?.modelo
  if (!fila || !modelo || fila.ras.length === 0) return ''
  return fila.ras
    .map((ra) => {
      const peso = modelo.pesosRa?.[ra.codigo] ?? 100 / fila.ras.length
      return `${ra.codigo} ${Math.round(peso * 100) / 100} %`
    })
    .join(' + ')
})

function primeraPestana(fila: FilaCalificacionClase | null): string {
  if (!fila) return 'final'
  if (modoUnidades.value) return fila.unidades[0] ? `u:${fila.unidades[0].unidadId}` : 'final'
  return fila.avaluaciones[0]?.avaluacionId ?? 'final'
}

function irATrimestre(avaluacionId: string): void {
  const unidad = filaSeleccionada.value?.unidades.find((item) => item.avaluacionId === avaluacionId)
  if (unidad) avaluacionActiva.value = `u:${unidad.unidadId}`
}

const rasSuperados = computed(
  () => filaSeleccionada.value?.ras.filter((ra) => ra.superado).length ?? 0
)

function formato(nota: number | null): string {
  return nota === null ? '—' : nota.toFixed(2).replace('.', ',')
}

function estado(fila: FilaCalificacionClase): string {
  return fila.aprobado ? 'Apto' : fila.vaAConvocatoria ? 'A convocatoria' : 'No apto'
}

function seleccionar(fila: FilaCalificacionClase): void {
  seleccionadoId.value = fila.alumno.id
  avaluacionActiva.value = primeraPestana(fila)
  mensaje.value = null
  errorGuardado.value = null
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
    const modelo = await window.api.criterios.obtener(grupo.value.id)
    if (!modelo) {
      resumen.value = null
      return
    }
    const [entregas, alumnos, notas, criteriosDisponibles, unidades] = await Promise.all([
      window.api.entregasClase.listar(grupo.value.id),
      window.api.alumnosClase.listar(grupo.value.id),
      window.api.notasClase.listar(grupo.value.id),
      window.api.entregasClase.criterios(grupo.value.id),
      window.api.unidadesProgramacion.listar(grupo.value.id)
    ])
    resumen.value = calcularResumenClase(
      grupo.value,
      modelo,
      entregas,
      alumnos,
      notas,
      criteriosDisponibles,
      unidades
    )
    const solicitado = Number(route.query.alumno)
    const anterior =
      Number.isFinite(solicitado) && solicitado > 0 ? solicitado : seleccionadoId.value
    const fila =
      resumen.value.alumnos.find((item) => item.alumno.id === anterior) ??
      resumen.value.alumnos[0] ??
      null
    seleccionadoId.value = fila?.alumno.id ?? null
    avaluacionActiva.value = primeraPestana(fila)
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(id, cargar)

async function exportarInformeAlumno(): Promise<void> {
  if (!grupo.value || !filaSeleccionada.value) return
  exportandoInforme.value = true
  errorGuardado.value = null
  mensaje.value = null
  try {
    const resultado = await window.api.informes.exportarPdf(
      grupo.value.id,
      filaSeleccionada.value.alumno.id
    )
    if (resultado.ok) {
      mensaje.value = resultado.ruta
        ? `Informe del alumno guardado: ${resultado.ruta}`
        : (resultado.mensaje ?? 'Informe del alumno generado.')
    } else if (resultado.mensaje && resultado.mensaje !== 'Guardado cancelado') {
      errorGuardado.value = resultado.mensaje
    }
  } catch (e) {
    errorGuardado.value = (e as Error).message ?? String(e)
  } finally {
    exportandoInforme.value = false
  }
}

function motivoAvaluacion(avaluacion: AvaluacionCalificacion): string {
  if (avaluacion.motivos.length > 0) return avaluacion.motivos.join(' · ')
  if (avaluacion.nota === null) return 'Sin entregas en esta avaluación'
  return avaluacion.suspensa ? 'Suspensa' : 'Correcta'
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver :a="grupo ? { name: 'alumnado', params: { grupoId: grupo.id } } : '/grupos'" />

    <header class="vista__cabecera calificaciones__page-header">
      <div>
        <h2>Calificaciones del grupo</h2>
        <p v-if="grupo" class="tenue">
          Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }}
        </p>
        <p v-if="descripcionModelo" class="tenue">{{ descripcionModelo }}</p>
      </div>
      <RouterLink class="boton" :to="{ name: 'convocatorias', params: { grupoId: id } }">
        Convocatorias
      </RouterLink>
    </header>

    <div v-if="cargando && !grupo" class="vacio">Cargando calificaciones…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <div v-else-if="grupo && !resumen" class="tarjeta">
      <h3>Faltan datos</h3>
      <p class="tenue">
        Para calcular notas hacen falta criterios, entregas y alumnado. Empieza por los criterios.
      </p>
      <RouterLink
        class="boton boton--principal"
        :to="{ name: 'criterios', params: { grupoId: grupo.id } }"
      >
        Ir a criterios
      </RouterLink>
    </div>

    <template v-else-if="resumen">
      <div v-if="resumen.alumnos.length === 0" class="vacio">
        No hay alumnado matriculado en este grupo.
      </div>

      <div v-else class="calificaciones__layout">
        <aside class="calificaciones__alumnos tarjeta">
          <div class="calificaciones__buscador">
            <input
              v-model="busqueda"
              type="search"
              placeholder="Buscar alumno/a…"
              aria-label="Buscar alumno o alumna"
            />
          </div>

          <p v-if="alumnosFiltrados.length === 0" class="tenue calificaciones__sin-resultados">
            No hay coincidencias.
          </p>

          <button
            v-for="fila in alumnosFiltrados"
            :key="fila.alumno.id"
            class="calificaciones__alumno"
            :class="{
              'calificaciones__alumno--activo': fila.alumno.id === filaSeleccionada?.alumno.id
            }"
            type="button"
            @click="seleccionar(fila)"
          >
            <span class="calificaciones__alumno-nombre">
              {{ fila.alumno.apellidos }}, {{ fila.alumno.nombre }}
            </span>
            <span class="calificaciones__alumno-meta">
              <span>Final {{ formato(fila.notaFinal) }}</span>
              <span
                class="calificaciones__estado"
                :class="fila.aprobado ? 'nota-aprobado' : 'nota-suspendido'"
              >
                {{ estado(fila) }}
              </span>
            </span>
            <span v-if="fila.incompleta" class="chip chip--aviso">incompleta</span>
            <span v-if="fila.rasNoSuperados.length > 0" class="chip chip--aviso">
              {{ fila.rasNoSuperados.length }} RA pendientes
            </span>
          </button>
        </aside>

        <section v-if="filaSeleccionada" class="calificaciones__detalle">
          <header class="calificaciones__alumno-cabecera">
            <h3>{{ filaSeleccionada.alumno.apellidos }}, {{ filaSeleccionada.alumno.nombre }}</h3>
            <span
              class="calificaciones__estado"
              :class="filaSeleccionada.aprobado ? 'nota-aprobado' : 'nota-suspendido'"
            >
              {{ estado(filaSeleccionada) }}
            </span>
          </header>

          <div v-if="opcionesAvaluaciones.length > 0" class="calificaciones__tabs">
            <SelectButton
              v-model="avaluacionActiva"
              :opciones="opcionesAvaluaciones"
              aria-label="Evaluación"
              compacto
            />
          </div>

          <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>
          <p v-if="errorGuardado" class="aviso aviso--error" role="alert">
            {{ errorGuardado }}
          </p>

          <section v-if="avaluacionSeleccionada" class="tarjeta calificaciones__avaluacion">
            <header class="calificaciones__avaluacion-cabecera">
              <div>
                <h3>{{ avaluacionSeleccionada.nombre }}</h3>
                <p class="tenue">{{ motivoAvaluacion(avaluacionSeleccionada) }}</p>
              </div>
              <strong
                class="calificaciones__nota-avaluacion"
                :class="avaluacionSeleccionada.suspensa ? 'nota-suspendido' : ''"
              >
                {{ formato(avaluacionSeleccionada.nota) }}
              </strong>
            </header>

            <div v-if="avaluacionSeleccionada.categorias.length === 0" class="tenue">
              Sin entregas en esta evaluación.
            </div>

            <div
              v-for="categoria in avaluacionSeleccionada.categorias"
              :key="categoria.categoriaId"
              class="calificaciones__categoria"
            >
              <header class="calificaciones__categoria-cabecera">
                <span class="chip">{{ categoria.nombre }} · {{ categoria.peso }} %</span>
                <span class="tenue">Media {{ formato(categoria.media) }}</span>
                <span v-if="categoria.suspensa" class="chip chip--aviso">suspensa</span>
              </header>

              <div class="calificaciones__entregas">
                <div
                  v-for="entrega in categoria.entregas"
                  :key="entrega.entregaId"
                  class="calificaciones__entrega"
                >
                  <div class="calificaciones__entrega-info">
                    <strong>{{ entrega.titulo }}</strong>
                    <span class="calificaciones__entrega-chips">
                      <span v-if="entrega.bloqueada" class="chip chip--aviso">bloqueada</span>
                      <span v-if="entrega.suspensa" class="chip chip--aviso">suspensa</span>
                    </span>
                  </div>
                  <div class="calificaciones__nota calificaciones__nota--lectura">
                    <span class="tenue">Nota</span>
                    <strong>{{ formato(entrega.nota) }}</strong>
                  </div>
                  <div class="calificaciones__anotacion calificaciones__anotacion--lectura">
                    <span class="tenue">Anotaciones</span>
                    <span>{{ entrega.observaciones || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-if="unidadSeleccionada" class="tarjeta calificaciones__avaluacion">
            <header class="calificaciones__avaluacion-cabecera">
              <div>
                <h3>
                  <template v-if="unidadSeleccionada.codigo"
                    >{{ unidadSeleccionada.codigo }} ·
                  </template>
                  {{ unidadSeleccionada.nombre }}
                </h3>
                <p class="tenue">Peso en la nota final: {{ unidadSeleccionada.peso }} %</p>
              </div>
              <strong class="calificaciones__nota-avaluacion">
                {{ formato(unidadSeleccionada.nota) }}
              </strong>
            </header>

            <div v-if="unidadSeleccionada.entregas.length === 0" class="tenue">
              Sin entregas asignadas a esta unidad.
            </div>

            <div v-else class="calificaciones__entregas">
              <div
                v-for="entrega in unidadSeleccionada.entregas"
                :key="entrega.entregaId"
                class="calificaciones__entrega"
              >
                <div class="calificaciones__entrega-info">
                  <strong>{{ entrega.titulo }}</strong>
                  <span class="calificaciones__entrega-chips">
                    <span v-if="entrega.bloqueada" class="chip chip--aviso">bloqueada</span>
                    <span v-if="entrega.suspensa" class="chip chip--aviso">suspensa</span>
                  </span>
                </div>
                <div class="calificaciones__nota calificaciones__nota--lectura">
                  <span class="tenue">Nota</span>
                  <strong>{{ formato(entrega.nota) }}</strong>
                </div>
                <div class="calificaciones__anotacion calificaciones__anotacion--lectura">
                  <span class="tenue">Anotaciones</span>
                  <span>{{ entrega.observaciones || '—' }}</span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="avaluacionActiva === 'final'" class="tarjeta calificaciones__final">
            <header class="calificaciones__final-cabecera">
              <div>
                <p class="dashboard__eyebrow">Resumen del módulo</p>
                <h3>Nota final</h3>
                <p class="tenue">
                  {{
                    modoUnidades
                      ? 'Calculada ponderando los trimestres y, dentro de cada uno, sus unidades.'
                      : 'Calculada a partir de las evaluaciones y las entregas.'
                  }}
                </p>
              </div>
              <div class="calificaciones__final-nota">
                <strong>{{ formato(filaSeleccionada.notaFinal) }}</strong>
                <span :class="filaSeleccionada.aprobado ? 'nota-aprobado' : 'nota-suspendido'">
                  {{ estado(filaSeleccionada) }}
                </span>
              </div>
            </header>

            <div class="calificaciones__final-evaluaciones">
              <template v-if="modoUnidades">
                <button
                  v-for="trimestre in filaSeleccionada.trimestres"
                  :key="trimestre.avaluacionId"
                  class="calificaciones__final-evaluacion"
                  type="button"
                  @click="irATrimestre(trimestre.avaluacionId)"
                >
                  <span>{{ trimestre.nombre }} · {{ trimestre.peso }} %</span>
                  <strong>{{ formato(trimestre.nota) }}</strong>
                </button>
              </template>
              <template v-else>
                <button
                  v-for="avaluacion in filaSeleccionada.avaluaciones"
                  :key="avaluacion.avaluacionId"
                  class="calificaciones__final-evaluacion"
                  type="button"
                  @click="avaluacionActiva = avaluacion.avaluacionId"
                >
                  <span>{{ avaluacion.nombre }}</span>
                  <strong>{{ formato(avaluacion.nota) }}</strong>
                </button>
              </template>
            </div>

            <div class="calificaciones__final-formula">
              <strong>Nota final = {{ formulaFinal || 'sin pesos configurados' }}</strong>
              <p class="tenue">
                Cada RA pondera según el porcentaje configurado; la nota final es la media ponderada
                de los RA. Las recuperaciones se gestionan desde Convocatorias.
              </p>
            </div>

            <div class="calificaciones__detalle-acciones">
              <button
                class="calificaciones__accion calificaciones__accion--pdf"
                type="button"
                :disabled="exportandoInforme"
                @click="exportarInformeAlumno"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6" />
                  <path d="M9 13h6" />
                  <path d="M9 17h4" />
                </svg>
                {{ exportandoInforme ? 'Generando…' : 'Informe PDF' }}
              </button>
              <RouterLink
                class="calificaciones__accion calificaciones__accion--informe"
                :to="{
                  name: 'informes',
                  params: { grupoId: grupo?.id },
                  query: { alumno: filaSeleccionada.alumno.id }
                }"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Ver informe
              </RouterLink>
            </div>
          </section>

          <section
            v-if="avaluacionActiva === 'final' && filaSeleccionada.ras.length > 0"
            class="tarjeta calificaciones__ra"
          >
            <header class="calificaciones__avaluacion-cabecera">
              <div>
                <h3>Resultados de aprendizaje</h3>
                <p class="tenue">
                  {{ rasSuperados }} de {{ filaSeleccionada.ras.length }} RA superados
                </p>
              </div>
              <span v-if="filaSeleccionada.rasNoSuperados.length > 0" class="chip chip--aviso">
                {{ filaSeleccionada.rasNoSuperados.length }} pendientes
              </span>
            </header>

            <p v-if="filaSeleccionada.rasNoSuperados.length > 0" class="aviso aviso--aviso">
              RA no superados:
              <strong>{{ filaSeleccionada.rasNoSuperados.join(', ') }}</strong>
            </p>

            <div class="calificaciones__ra-lista">
              <div
                v-for="ra in filaSeleccionada.ras"
                :key="ra.codigo"
                class="calificaciones__ra-fila"
              >
                <div class="calificaciones__ra-info">
                  <span class="codigo">{{ ra.codigo }}</span>
                  <span class="tenue">{{ ra.descripcion }}</span>
                </div>
                <span class="tenue calificaciones__ra-entregas">
                  {{ ra.entregas.length }}
                  {{ ra.entregas.length === 1 ? 'entrega' : 'entregas' }}
                </span>
                <strong>{{ formato(ra.nota) }}</strong>
                <span
                  class="chip"
                  :class="ra.superado ? 'chip--ok' : ra.nota === null ? '' : 'chip--aviso'"
                >
                  {{ ra.superado ? 'Superado' : ra.nota === null ? 'Sin evaluar' : 'No superado' }}
                </span>
              </div>
            </div>
          </section>
        </section>
      </div>
    </template>
  </section>
</template>

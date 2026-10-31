<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import NavegacionMes from '@renderer/components/NavegacionMes.vue'
import { calcularResumenClase } from '@shared/calcular-calificaciones'
import { DIAS_SEMANA, etiquetaModalidad } from '@shared/grupos'
import type {
  AlumnoClase,
  CriterioDisponible,
  DiaCalendario,
  EntregaClase,
  EventoEvaluacionClase,
  ModeloEvaluacion,
  NotaGuardadaClase,
  PeriodoFormacionEmpresa,
  ProgramacionAula,
  ResumenCalificacionesClase,
  UnidadProgramacion
} from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

const route = useRoute()
const store = useGruposClaseStore()
const programacion = ref<ProgramacionAula[]>([])
const criterios = ref<ModeloEvaluacion | null>(null)
const entregas = ref<EntregaClase[]>([])
const alumnos = ref<AlumnoClase[]>([])
const notas = ref<NotaGuardadaClase[]>([])
const criteriosDisponibles = ref<CriterioDisponible[]>([])
const calificaciones = ref<ResumenCalificacionesClase | null>(null)
const eventos = ref<EventoEvaluacionClase[]>([])
const unidades = ref<UnidadProgramacion[]>([])
const formacion = ref<PeriodoFormacionEmpresa[]>([])
const calendario = ref<DiaCalendario[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const demo = ref(false)

const id = computed(() => Number(route.params.id))
const grupo = computed(() => store.grupo(id.value))

function isoLocal(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha)
  copia.setDate(copia.getDate() + dias)
  return copia
}

const hoy = isoLocal(new Date())
const limite = isoLocal(sumarDias(new Date(), 15))
const mesAgenda = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

type TipoAgenda = 'entrega' | 'examen' | 'evaluacion' | 'no_lectivo'

interface ItemAgenda {
  id: string
  fecha: string
  hora: string | null
  titulo: string
  tipo: TipoAgenda
}

const quincena = computed(() =>
  programacion.value
    .filter((fila) => fila.fecha >= hoy && fila.fecha <= limite)
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
)

const sinContenido = computed(() => quincena.value.filter((fila) => !fila.contenido.trim()).length)

const resumenCategorias = computed(() => {
  const categorias = criterios.value?.categorias ?? []
  return categorias.length === 0
    ? ''
    : categorias.map((categoria) => `${categoria.nombre} ${categoria.peso} %`).join(' · ')
})

const media = computed(() => {
  const filas = calificaciones.value?.alumnos ?? []
  const conNota = filas.filter((fila) => fila.notaFinal !== null)
  if (conNota.length === 0) return null
  return (
    Math.round(
      (conNota.reduce((total, fila) => total + (fila.notaFinal ?? 0), 0) / conNota.length) * 100
    ) / 100
  )
})

const aprobados = computed(
  () => calificaciones.value?.alumnos.filter((fila) => fila.aprobado).length ?? 0
)

const alumnosActivos = computed(() => alumnos.value.filter((alumno) => alumno.activo).length)

function formato(nota: number | null): string {
  return nota === null ? '—' : nota.toFixed(2).replace('.', ',')
}

const proximasSesiones = computed(() =>
  programacion.value
    .filter((fila) => fila.fecha >= hoy)
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
    .slice(0, 5)
)

const sesionesHoy = computed(() =>
  programacion.value
    .filter((fila) => fila.fecha === hoy)
    .slice()
    .sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? '') || a.id - b.id)
)

const agendaItems = computed<ItemAgenda[]>(() => {
  const items = new Map<string, ItemAgenda>()
  const clave = (fecha: string, titulo: string): string => `${fecha}|${titulo.toLowerCase()}`

  for (const evento of eventos.value) {
    const tipo: TipoAgenda = evento.tipo === 'examen' ? 'examen' : 'evaluacion'
    items.set(clave(evento.fecha, evento.titulo), {
      id: `evento-${evento.id}`,
      fecha: evento.fecha,
      hora: evento.hora,
      titulo: evento.titulo,
      tipo
    })
  }

  for (const entrega of entregas.value) {
    if (!entrega.fecha_limite) continue
    const entrada = clave(entrega.fecha_limite, entrega.titulo)
    if (items.has(entrada)) continue
    items.set(entrada, {
      id: `entrega-${entrega.id}`,
      fecha: entrega.fecha_limite,
      hora: null,
      titulo: entrega.titulo,
      tipo: 'entrega'
    })
  }

  for (const dia of calendario.value) {
    if (dia.tipo === 'lectivo') continue
    const titulo =
      dia.descripcion ||
      (dia.tipo === 'vacaciones'
        ? 'Vacaciones'
        : dia.tipo === 'festivo'
          ? 'Festivo'
          : 'Día no lectivo')
    const entrada = clave(dia.fecha, titulo)
    if (items.has(entrada)) continue
    items.set(entrada, {
      id: `calendario-${dia.id}`,
      fecha: dia.fecha,
      hora: null,
      titulo,
      tipo: 'no_lectivo'
    })
  }

  return [...items.values()].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
      a.titulo.localeCompare(b.titulo)
  )
})

const agendaProxima = computed(() =>
  agendaItems.value.filter((item) => item.fecha >= hoy && item.tipo !== 'no_lectivo').slice(0, 6)
)

const proximosNoLectivos = computed(() =>
  agendaItems.value.filter((item) => item.fecha >= hoy && item.tipo === 'no_lectivo').slice(0, 8)
)

const mesAgendaTexto = computed(() => {
  const texto = mesAgenda.value.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

const PALETA_UNIDADES = ['#2563eb', '#0891b2', '#7c3aed', '#c2410c', '#0f766e', '#be185d']

function colorUnidad(unidad: UnidadProgramacion): string {
  const indice = unidades.value.findIndex((item) => item.id === unidad.id)
  return PALETA_UNIDADES[(indice >= 0 ? indice : 0) % PALETA_UNIDADES.length]
}

function unidadesDelDia(fecha: string): UnidadProgramacion[] {
  const porId = new Map<number, UnidadProgramacion>()
  for (const unidad of unidades.value) {
    if (
      unidad.fecha_inicio &&
      unidad.fecha_fin &&
      unidad.fecha_inicio <= fecha &&
      unidad.fecha_fin >= fecha
    ) {
      porId.set(unidad.id, unidad)
    }
  }
  for (const fila of programacion.value) {
    if (fila.fecha !== fecha || fila.unidad_id === null) continue
    const unidad = unidades.value.find((item) => item.id === fila.unidad_id)
    if (unidad) porId.set(unidad.id, unidad)
  }
  return [...porId.values()]
}

const celdasAgenda = computed(() => {
  const anio = mesAgenda.value.getFullYear()
  const mes = mesAgenda.value.getMonth()
  const primero = new Date(anio, mes, 1)
  const desplazamiento = (primero.getDay() + 6) % 7
  const inicio = new Date(anio, mes, 1 - desplazamiento)
  return Array.from({ length: 42 }, (_, indice) => {
    const fecha = sumarDias(inicio, indice)
    const iso = isoLocal(fecha)
    const items = agendaItems.value.filter((item) => item.fecha === iso)
    const noLectivo = items.some((item) => item.tipo === 'no_lectivo')
    return {
      fecha: iso,
      dia: fecha.getDate(),
      esMes: fecha.getMonth() === mes,
      esHoy: iso === hoy,
      items,
      unidades: noLectivo ? [] : unidadesDelDia(iso)
    }
  })
})

function tituloCelda(celda: {
  unidades: UnidadProgramacion[]
  items: ItemAgenda[]
}): string | undefined {
  const partes = [
    ...celda.unidades.map((unidad) => `${unidad.codigo ?? 'UD'} · ${unidad.nombre}`),
    ...celda.items.map((item) => item.titulo)
  ]
  return partes.length > 0 ? partes.join(' · ') : undefined
}

function cambiarMesAgenda(delta: number): void {
  mesAgenda.value = new Date(mesAgenda.value.getFullYear(), mesAgenda.value.getMonth() + delta, 1)
}

function irMesActualAgenda(): void {
  const ahora = new Date()
  mesAgenda.value = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
}

function claseDiaAgenda(items: ItemAgenda[]): string {
  if (items.some((item) => item.tipo === 'no_lectivo')) return 'agenda-mini__celda--no-lectivo'
  if (items.some((item) => item.tipo === 'examen')) return 'agenda-mini__celda--examen'
  if (items.some((item) => item.tipo === 'evaluacion')) return 'agenda-mini__celda--evaluacion'
  if (items.some((item) => item.tipo === 'entrega')) return 'agenda-mini__celda--entrega'
  return ''
}

const formacionActual = computed(() =>
  formacion.value.filter((periodo) => periodo.fecha_inicio <= hoy && periodo.fecha_fin >= hoy)
)

const formacionProxima = computed(
  () =>
    formacion.value
      .filter((periodo) => periodo.fecha_inicio > hoy)
      .slice()
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0] ?? null
)

const sesionesConUnidad = computed(
  () => programacion.value.filter((fila) => fila.unidad_id !== null).length
)

const unidadesSinSesiones = computed(
  () => unidades.value.filter((unidad) => unidad.sesiones.length === 0).length
)

const entregasSinRubrica = computed(
  () => entregas.value.filter((entrega) => !entrega.rubrica && !entrega.rubrica_archivo).length
)

const pendientesCorreccion = computed(() => {
  const activos = alumnos.value.filter((alumno) => alumno.activo)
  return entregas.value
    .map((entrega) => {
      const conNota = new Set(
        notas.value
          .filter((nota) => nota.entrega_id === entrega.id && nota.nota !== null)
          .map((nota) => nota.alumno_id)
      )
      const pendientes = activos.filter((alumno) => !conNota.has(alumno.id)).length
      return { entrega, pendientes }
    })
    .filter((item) => item.pendientes > 0)
    .sort((a, b) => b.pendientes - a.pendientes)
})

const totalPendientes = computed(() =>
  pendientesCorreccion.value.reduce((total, item) => total + item.pendientes, 0)
)

const alumnosRiesgo = computed(() => {
  const filas = calificaciones.value?.alumnos ?? []
  return filas
    .filter((fila) => fila.rasNoSuperados.length > 0 || fila.incompleta || fila.notaFinal === null)
    .slice()
    .sort((a, b) => (a.notaFinal ?? -1) - (b.notaFinal ?? -1))
    .slice(0, 5)
})

const totalRiesgo = computed(
  () =>
    (calificaciones.value?.alumnos ?? []).filter(
      (fila) => fila.rasNoSuperados.length > 0 || fila.incompleta || fila.notaFinal === null
    ).length
)

const rasSinEvidencia = computed(() =>
  (calificaciones.value?.alumnos[0]?.ras ?? []).filter((ra) => ra.entregas.length === 0)
)

const progresoCorreccion = computed(() => {
  const activos = alumnos.value.filter((alumno) => alumno.activo).length
  const total = entregas.value.length * activos
  if (total === 0) return 0
  const puestas = notas.value.filter(
    (nota) =>
      nota.nota !== null &&
      alumnos.value.some((alumno) => alumno.id === nota.alumno_id && alumno.activo)
  ).length
  return Math.round((puestas / total) * 100)
})

const progresoProgramacion = computed(() => {
  if (programacion.value.length === 0) return 0
  const conContenido = programacion.value.filter((fila) => fila.contenido.trim()).length
  return Math.round((conContenido / programacion.value.length) * 100)
})

const progresoRa = computed(() => {
  const ras = calificaciones.value?.alumnos[0]?.ras ?? []
  if (ras.length === 0) return 0
  return Math.round((ras.filter((ra) => ra.entregas.length > 0).length / ras.length) * 100)
})

const tareasPendientes = computed(() => {
  const tareas: { texto: string; ruta: string }[] = []
  if (rasSinEvidencia.value.length > 0) {
    tareas.push({
      texto: `${rasSinEvidencia.value.length} RA sin evidencias`,
      ruta: 'boe'
    })
  }
  if (entregasSinRubrica.value > 0) {
    tareas.push({
      texto: `${entregasSinRubrica.value} entrega(s) sin rúbrica`,
      ruta: 'entregas'
    })
  }
  if (sinContenido.value > 0) {
    tareas.push({
      texto: `${sinContenido.value} día(s) de la quincena sin contenido`,
      ruta: 'programacion'
    })
  }
  if (unidadesSinSesiones.value > 0) {
    tareas.push({
      texto: `${unidadesSinSesiones.value} unidad(es) sin sesiones asignadas`,
      ruta: 'programacion-didactica'
    })
  }
  if (calendario.value.length === 0) {
    tareas.push({
      texto: 'Calendario escolar sin importar',
      ruta: 'programacion-didactica'
    })
  }
  return tareas
})

function resumenRas(fila: { rasNoSuperados: string[] }): string {
  if (fila.rasNoSuperados.length <= 3) return fila.rasNoSuperados.join(', ')
  return `${fila.rasNoSuperados.slice(0, 3).join(', ')} +${fila.rasNoSuperados.length - 3}`
}

function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar()
    if (!grupo.value) {
      error.value = 'No se ha encontrado el grupo.'
      return
    }
    const [
      programacionGrupo,
      modelo,
      entregasGrupo,
      alumnosGrupo,
      notasGrupo,
      criteriosCe,
      eventosGrupo,
      unidadesGrupo,
      formacionGrupo,
      calendarioCurso
    ] = await Promise.all([
      window.api.programacion.listar(id.value),
      window.api.criterios.obtener(id.value),
      window.api.entregasClase.listar(id.value),
      window.api.alumnosClase.listar(id.value),
      window.api.notasClase.listar(id.value),
      window.api.entregasClase.criterios(id.value),
      window.api.eventosEvaluacion.listar(id.value),
      window.api.unidadesProgramacion.listar(id.value),
      window.api.formacionEmpresa.listar(id.value),
      window.api.calendarioEscolar.listar(grupo.value.curso_academico_id)
    ])
    programacion.value = programacionGrupo
    criterios.value = modelo
    entregas.value = entregasGrupo
    alumnos.value = alumnosGrupo
    notas.value = notasGrupo
    criteriosDisponibles.value = criteriosCe
    eventos.value = eventosGrupo
    unidades.value = unidadesGrupo
    formacion.value = formacionGrupo
    calendario.value = calendarioCurso
    calificaciones.value = modelo
      ? calcularResumenClase(
          grupo.value,
          modelo,
          entregasGrupo,
          alumnosGrupo,
          notasGrupo,
          criteriosCe,
          unidadesGrupo
        )
      : null

    // En la previsualización, si el grupo no tiene programación se muestra el
    // ejemplo para que el dashboard no quede vacío. No se guarda.
    if (import.meta.env.DEV && programacion.value.length === 0) {
      const { diasProgramacionDemo } = await import('@shared/demo-programacion')
      programacion.value = diasProgramacionDemo().map((dia, indice) => ({
        id: -(indice + 1),
        grupo_clase_id: id.value,
        unidad_id: null,
        hora: null,
        orden: 0,
        ...dia,
        creado_en: '',
        actualizado_en: ''
      }))
      demo.value = true
    }
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
    <div v-if="cargando && !grupo" class="vacio">Cargando grupo…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="grupo">
      <header class="dashboard__cabecera">
        <div>
          <p class="dashboard__eyebrow">Curso {{ grupo.curso_academico_nombre }}</p>
          <h2>{{ grupo.nombre }}</h2>
          <p class="tenue">
            {{ grupo.modulo_nombre }} · {{ etiquetaModalidad(grupo.modalidad) }} ·
            {{ grupo.ciclo_id.toUpperCase() }} {{ grupo.curso }}º
          </p>
        </div>
      </header>

      <section class="dashboard__hoy" aria-label="Resumen de hoy">
        <article class="tarjeta dashboard__hoy-card">
          <p class="dashboard__eyebrow">Hoy</p>
          <strong>
            {{ sesionesHoy.length }}
            {{ sesionesHoy.length === 1 ? 'sesión' : 'sesiones' }}
          </strong>
          <p v-if="sesionesHoy[0]">
            <template v-if="sesionesHoy[0].hora">{{ sesionesHoy[0].hora }} · </template>
            {{ sesionesHoy[0].contenido || 'Sin contenido' }}
          </p>
          <p v-else-if="proximasSesiones[0]" class="tenue">
            Próxima: {{ fechaCorta(proximasSesiones[0].fecha) }} ·
            {{ proximasSesiones[0].contenido || 'Sin contenido' }}
          </p>
          <p v-else class="tenue">Sin sesiones programadas.</p>
          <RouterLink
            :to="{ name: 'programacion', params: { grupoId: grupo.id } }"
            class="dashboard__enlace"
          >
            Ver programación
          </RouterLink>
        </article>

        <article class="tarjeta dashboard__hoy-card">
          <p class="dashboard__eyebrow">Pendiente de corregir</p>
          <strong>{{ totalPendientes }} {{ totalPendientes === 1 ? 'nota' : 'notas' }}</strong>
          <p>
            {{ pendientesCorreccion.length }}
            {{ pendientesCorreccion.length === 1 ? 'entrega' : 'entregas' }} sin completar
          </p>
          <RouterLink
            :to="{ name: 'calificaciones', params: { grupoId: grupo.id } }"
            class="dashboard__enlace"
          >
            Ir a calificaciones
          </RouterLink>
        </article>

        <article class="tarjeta dashboard__hoy-card">
          <p class="dashboard__eyebrow">Alumnado en riesgo</p>
          <strong>{{ totalRiesgo }} {{ totalRiesgo === 1 ? 'alumno' : 'alumnos' }}</strong>
          <p>RA pendientes, notas incompletas o sin nota final.</p>
          <RouterLink
            :to="{ name: 'calificaciones', params: { grupoId: grupo.id } }"
            class="dashboard__enlace"
          >
            Ver alumnado
          </RouterLink>
        </article>
      </section>

      <div class="dashboard__grid">
        <div class="dashboard__principal">
          <section class="tarjeta">
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Cola de trabajo</h3>
                <p class="tenue">Lo que pide una acción ahora mismo</p>
              </div>
            </header>

            <div v-if="totalPendientes > 0" class="dashboard__cola">
              <div class="dashboard__cola-cabecera">
                <span>Notas por poner</span>
                <strong>{{ totalPendientes }}</strong>
              </div>
              <ul class="dashboard__tareas">
                <li v-for="item in pendientesCorreccion.slice(0, 4)" :key="item.entrega.id">
                  <span class="dashboard__tarea-punto" aria-hidden="true"></span>
                  <span>{{ item.entrega.titulo }}</span>
                  <span class="chip chip--aviso">{{ item.pendientes }} pendientes</span>
                  <RouterLink
                    :to="{
                      name: 'entrega-notas',
                      params: { grupoId: grupo.id, entregaId: item.entrega.id }
                    }"
                    class="dashboard__enlace"
                  >
                    Corregir
                  </RouterLink>
                </li>
              </ul>
            </div>
            <p v-else class="dashboard__ra-ok">No hay notas pendientes.</p>

            <div v-if="tareasPendientes.length > 0" class="dashboard__revisar">
              <h4>Revisar también</h4>
              <ul class="dashboard__tareas">
                <li v-for="tarea in tareasPendientes" :key="tarea.texto">
                  <span class="dashboard__tarea-punto" aria-hidden="true"></span>
                  <span>{{ tarea.texto }}</span>
                  <RouterLink
                    :to="{ name: tarea.ruta, params: { grupoId: grupo.id } }"
                    class="dashboard__enlace"
                  >
                    Ir
                  </RouterLink>
                </li>
              </ul>
            </div>
          </section>

          <section class="tarjeta">
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Alumnado que necesita atención</h3>
                <p class="tenue">
                  {{ totalRiesgo }} caso(s) en riesgo · se muestran los 5 más urgentes
                </p>
              </div>
              <RouterLink
                :to="{ name: 'calificaciones', params: { grupoId: grupo.id } }"
                class="dashboard__enlace"
              >
                Ver calificaciones
              </RouterLink>
            </header>

            <p v-if="alumnosRiesgo.length === 0" class="dashboard__ra-ok">
              No hay alumnado en riesgo ahora mismo.
            </p>
            <div v-else class="tabla-scroll">
              <table class="tabla tabla--compacta">
                <thead>
                  <tr>
                    <th>Alumno/a</th>
                    <th class="num">Final</th>
                    <th>Estado</th>
                    <th>RA pendientes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fila in alumnosRiesgo" :key="fila.alumno.id">
                    <td>
                      <RouterLink
                        :to="{
                          name: 'calificaciones',
                          params: { grupoId: grupo.id },
                          query: { alumno: fila.alumno.id }
                        }"
                        class="dashboard__alumno"
                      >
                        {{ fila.alumno.apellidos }}, {{ fila.alumno.nombre }}
                      </RouterLink>
                    </td>
                    <td class="num">
                      <strong>{{ formato(fila.notaFinal) }}</strong>
                    </td>
                    <td>
                      <span
                        class="chip"
                        :class="
                          fila.aprobado ? 'chip--ok' : fila.vaAConvocatoria ? 'chip--aviso' : ''
                        "
                      >
                        {{
                          fila.aprobado
                            ? 'Apto'
                            : fila.vaAConvocatoria
                              ? 'A convocatoria'
                              : 'No apto'
                        }}
                      </span>
                    </td>
                    <td>
                      <span v-if="fila.rasNoSuperados.length === 0" class="tenue">—</span>
                      <span v-else class="chip chip--aviso">{{ resumenRas(fila) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside class="dashboard__lateral">
          <section class="tarjeta">
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Agenda y próximas fechas</h3>
                <p class="tenue">Entregas, exámenes y calendario</p>
              </div>
              <RouterLink
                :to="{ name: 'programacion-didactica', params: { grupoId: grupo.id } }"
                class="dashboard__enlace"
              >
                Ver planificación
              </RouterLink>
            </header>
            <div class="agenda-mini">
              <NavegacionMes
                class="agenda-mini__barra"
                :etiqueta="mesAgendaTexto"
                @anterior="cambiarMesAgenda(-1)"
                @siguiente="cambiarMesAgenda(1)"
                @hoy="irMesActualAgenda"
              />

              <div class="agenda-mini__grid">
                <span
                  v-for="dia in DIAS_SEMANA"
                  :key="`agenda-cabecera-${dia.valor}`"
                  class="agenda-mini__dia-semana"
                >
                  {{ dia.corto }}
                </span>
                <div
                  v-for="celda in celdasAgenda"
                  :key="celda.fecha"
                  class="agenda-mini__celda"
                  :class="[
                    claseDiaAgenda(celda.items),
                    {
                      'agenda-mini__celda--fuera': !celda.esMes,
                      'agenda-mini__celda--hoy': celda.esHoy
                    }
                  ]"
                  :title="tituloCelda(celda)"
                  :aria-current="celda.esHoy ? 'date' : undefined"
                >
                  <span class="agenda-mini__numero">{{ celda.dia }}</span>
                  <span v-if="celda.unidades.length > 0" class="agenda-mini__unidades">
                    <span
                      v-for="unidad in celda.unidades.slice(0, 2)"
                      :key="unidad.id"
                      class="agenda-mini__unidad"
                      :style="{ background: colorUnidad(unidad) }"
                      :title="unidad.nombre"
                    >
                      {{ unidad.codigo ?? 'UD' }}
                    </span>
                    <span
                      v-if="celda.unidades.length > 2"
                      class="agenda-mini__unidad agenda-mini__unidad--mas"
                    >
                      +{{ celda.unidades.length - 2 }}
                    </span>
                  </span>
                </div>
              </div>
              <div class="agenda-mini__leyenda">
                <span>
                  <i class="agenda-mini__muestra agenda-mini__muestra--entrega"></i>Entrega
                </span>
                <span>
                  <i class="agenda-mini__muestra agenda-mini__muestra--examen"></i>Examen
                </span>
                <span>
                  <i class="agenda-mini__muestra agenda-mini__muestra--evaluacion"></i>Evaluación
                </span>
                <span>
                  <i class="agenda-mini__muestra agenda-mini__muestra--no-lectivo"></i>No lectivo
                </span>
              </div>
            </div>

            <p v-if="agendaProxima.length === 0" class="tenue">No hay hitos próximos.</p>
            <ul v-else class="dashboard__proximas-lista">
              <li v-for="item in agendaProxima" :key="item.id">
                <span class="dashboard__fecha" :class="`dashboard__fecha--${item.tipo}`">
                  {{ fechaCorta(item.fecha) }}
                </span>
                <span class="dashboard__contenido">
                  <small v-if="item.hora" class="tenue">{{ item.hora }} · </small>
                  {{ item.titulo }}
                </span>
              </li>
            </ul>
            <div v-if="proximosNoLectivos.length > 0" class="dashboard__no-lectivos">
              <span class="tenue">Días no lectivos:</span>
              <span
                v-for="dia in proximosNoLectivos"
                :key="dia.id"
                class="dashboard__fecha dashboard__fecha--no_lectivo"
                :title="dia.titulo"
              >
                {{ fechaCorta(dia.fecha) }}
              </span>
            </div>
          </section>
        </aside>
      </div>

      <details class="tarjeta dashboard__mas">
        <summary class="dashboard__mas-resumen">
          <span>
            <strong>Más información del grupo</strong>
            <small>Estado, formación en empresa y programación didáctica</small>
          </span>
          <span class="dashboard__mas-flecha" aria-hidden="true">⌄</span>
        </summary>

        <div class="dashboard__mas-grid">
          <section>
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Estado del grupo</h3>
                <p class="tenue">{{ resumenCategorias }}</p>
              </div>
            </header>
            <ul class="dashboard__estado">
              <li>
                <span>Alumnos activos</span>
                <strong>{{ alumnosActivos }} / {{ alumnos.length }}</strong>
              </li>
              <li>
                <span>Nota media</span>
                <strong>{{ formato(media) }}</strong>
              </li>
              <li>
                <span>Aprobados</span>
                <strong>{{ aprobados }} / {{ alumnos.length }}</strong>
              </li>
              <li>
                <span>RA con evidencias</span>
                <strong>{{ progresoRa }} %</strong>
              </li>
            </ul>

            <div class="dashboard__progresos">
              <div class="dashboard__progreso-cabecera">
                <span class="tenue">Programación</span>
                <strong>{{ progresoProgramacion }} %</strong>
              </div>
              <div class="dashboard__progreso-pista">
                <span :style="{ width: `${progresoProgramacion}%` }"></span>
              </div>
              <div class="dashboard__progreso-cabecera">
                <span class="tenue">Corrección de notas</span>
                <strong>{{ progresoCorreccion }} %</strong>
              </div>
              <div class="dashboard__progreso-pista">
                <span :style="{ width: `${progresoCorreccion}%` }"></span>
              </div>
            </div>
          </section>

          <section>
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Formación en empresa</h3>
                <p class="tenue">FCT y formación dual</p>
              </div>
              <RouterLink
                :to="{ name: 'alumnado', params: { grupoId: grupo.id } }"
                class="dashboard__enlace"
              >
                Ver alumnado
              </RouterLink>
            </header>
            <ul class="dashboard__estado">
              <li>
                <span>En empresa ahora</span>
                <strong>{{ formacionActual.length }}</strong>
              </li>
              <li>
                <span>Periodos</span>
                <strong>{{ formacion.length }}</strong>
              </li>
              <li>
                <span>Próximo periodo</span>
                <strong>
                  {{ formacionProxima ? fechaCorta(formacionProxima.fecha_inicio) : '—' }}
                </strong>
              </li>
            </ul>
            <p v-if="formacionProxima" class="tenue">
              {{ formacionProxima.empresa }} · hasta
              {{ fechaCorta(formacionProxima.fecha_fin) }}
            </p>
            <p v-else-if="formacionActual.length > 0" class="tenue">
              {{ formacionActual[0].empresa }} · hasta
              {{ fechaCorta(formacionActual[0].fecha_fin) }}
            </p>
            <p v-else class="tenue">Sin periodos de formación registrados.</p>
          </section>

          <section>
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Programación didáctica</h3>
                <p class="tenue">Unidades, sesiones y calendario</p>
              </div>
              <RouterLink
                :to="{ name: 'programacion-didactica', params: { grupoId: grupo.id } }"
                class="dashboard__enlace"
              >
                Abrir
              </RouterLink>
            </header>
            <ul class="dashboard__estado">
              <li>
                <span>Unidades</span>
                <strong>{{ unidades.length }}</strong>
              </li>
              <li>
                <span>Sesiones con unidad</span>
                <strong>{{ sesionesConUnidad }} / {{ programacion.length }}</strong>
              </li>
              <li>
                <span>Calendario escolar</span>
                <strong>{{ calendario.length }} días</strong>
              </li>
            </ul>
            <p v-if="unidadesSinSesiones > 0" class="tenue">
              {{ unidadesSinSesiones }} unidad(es) sin sesiones asignadas.
            </p>
            <div v-else-if="unidades.length > 0" class="dashboard__ra-ok">
              Todas las unidades tienen sesiones asignadas.
            </div>
          </section>
        </div>
      </details>
    </template>
  </section>
</template>

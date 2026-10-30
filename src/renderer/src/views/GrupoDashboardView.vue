<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { diasProgramacionDemo } from '@shared/demo-programacion'
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

const proximasEntregas = computed(() =>
  entregas.value
    .filter((entrega) => entrega.fecha_limite && entrega.fecha_limite >= hoy)
    .slice()
    .sort((a, b) => (a.fecha_limite ?? '').localeCompare(b.fecha_limite ?? ''))
    .slice(0, 3)
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
  agendaItems.value.filter((item) => item.fecha >= hoy).slice(0, 6)
)

const mesAgendaTexto = computed(() => {
  const texto = mesAgenda.value.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

const celdasAgenda = computed(() => {
  const anio = mesAgenda.value.getFullYear()
  const mes = mesAgenda.value.getMonth()
  const primero = new Date(anio, mes, 1)
  const desplazamiento = (primero.getDay() + 6) % 7
  const inicio = new Date(anio, mes, 1 - desplazamiento)
  return Array.from({ length: 42 }, (_, indice) => {
    const fecha = sumarDias(inicio, indice)
    const iso = isoLocal(fecha)
    return {
      fecha: iso,
      dia: fecha.getDate(),
      esMes: fecha.getMonth() === mes,
      esHoy: iso === hoy,
      items: agendaItems.value.filter((item) => item.fecha === iso)
    }
  })
})

function cambiarMesAgenda(delta: number): void {
  mesAgenda.value = new Date(mesAgenda.value.getFullYear(), mesAgenda.value.getMonth() + delta, 1)
}

function irMesActualAgenda(): void {
  const ahora = new Date()
  mesAgenda.value = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
}

function etiquetaAgenda(tipo: TipoAgenda): string {
  if (tipo === 'examen') return 'Examen'
  if (tipo === 'evaluacion') return 'Evaluación'
  if (tipo === 'no_lectivo') return 'No lectivo'
  return 'Entrega'
}

function claseAgenda(tipo: TipoAgenda): string {
  return `agenda-punto--${tipo.replace('_', '-')}`
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

const horasFormacion = computed(() =>
  formacion.value.reduce((total, periodo) => total + (periodo.horas ?? 0), 0)
)

const sesionesConUnidad = computed(
  () => programacion.value.filter((fila) => fila.unidad_id !== null).length
)

const unidadesSinSesiones = computed(
  () => unidades.value.filter((unidad) => unidad.sesiones.length === 0).length
)

function unidadDeSesion(fila: ProgramacionAula): UnidadProgramacion | null {
  return unidades.value.find((unidad) => unidad.id === fila.unidad_id) ?? null
}

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
  if (totalPendientes.value > 0) {
    tareas.push({
      texto: `${totalPendientes.value} notas por poner en ${pendientesCorreccion.value.length} entrega(s)`,
      ruta: 'calificaciones'
    })
  }
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
          criteriosCe
        )
      : null

    // En la previsualización, si el grupo no tiene programación se muestra el
    // ejemplo para que el dashboard no quede vacío. No se guarda.
    if (import.meta.env.DEV && programacion.value.length === 0) {
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
        <div class="dashboard__chips">
          <span class="chip" :class="grupo.criterios ? 'chip--ok' : 'chip--aviso'">
            {{ grupo.criterios ? 'Criterios definidos' : 'Sin criterios' }}
          </span>
          <span class="chip">{{ grupo.ra }} RA · {{ grupo.ce }} CE</span>
        </div>
      </header>

      <nav class="dashboard__toolbar" aria-label="Acciones del grupo">
        <div class="dashboard__toolbar-grupo">
          <span class="dashboard__toolbar-titulo">Día a día</span>
          <RouterLink
            class="dashboard__tool"
            :to="{ name: 'programacion', params: { grupoId: grupo.id } }"
          >
            <span class="dashboard__tool-icono"
              ><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4" />
                <path d="M8 2v4" />
                <path d="M3 10h18" /></svg
            ></span>
            Programación
          </RouterLink>
          <RouterLink
            class="dashboard__tool"
            :to="{ name: 'horario-grupo', params: { grupoId: grupo.id } }"
          >
            <span class="dashboard__tool-icono"
              ><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" /></svg
            ></span>
            Horario
          </RouterLink>
          <RouterLink
            class="dashboard__tool"
            :to="{ name: 'faltas', params: { grupoId: grupo.id } }"
          >
            <span class="dashboard__tool-icono"
              ><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg
            ></span>
            Faltas
          </RouterLink>
          <RouterLink
            class="dashboard__tool"
            :to="{ name: 'entregas', params: { grupoId: grupo.id } }"
          >
            <span class="dashboard__tool-icono"
              ><svg
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
                <path d="M8 13h8" />
                <path d="M8 17h5" /></svg
            ></span>
            Entregas
          </RouterLink>
          <RouterLink
            class="dashboard__tool"
            :to="{ name: 'calificaciones', params: { grupoId: grupo.id } }"
          >
            <span class="dashboard__tool-icono"
              ><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3v18h18" />
                <path d="M7 16v-5" />
                <path d="M12 16V8" />
                <path d="M17 16v-3" /></svg
            ></span>
            Calificaciones
          </RouterLink>
        </div>

        <div class="dashboard__toolbar-grupo">
          <span class="dashboard__toolbar-titulo">Consulta</span>
          <RouterLink
            class="dashboard__tool"
            :to="{ name: 'alumnado', params: { grupoId: grupo.id } }"
          >
            <span class="dashboard__tool-icono"
              ><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg
            ></span>
            Alumnado
          </RouterLink>
          <RouterLink
            class="dashboard__tool"
            :to="{ name: 'programacion-didactica', params: { grupoId: grupo.id } }"
          >
            <span class="dashboard__tool-icono">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="8" y="2" width="8" height="4" rx="1" />
                <path
                  d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                />
                <path d="M9 12h6" />
                <path d="M9 16h4" />
              </svg>
            </span>
            Programación didáctica
          </RouterLink>
          <RouterLink
            class="dashboard__tool"
            :to="{ name: 'informes', params: { grupoId: grupo.id } }"
          >
            <span class="dashboard__tool-icono"
              ><svg
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
                <path d="M8 13h8" />
                <path d="M8 17h5" /></svg
            ></span>
            Informes
          </RouterLink>
        </div>
      </nav>

      <section class="dashboard__stats">
        <article class="tarjeta dashboard__stat">
          <span class="dashboard__stat-icono dashboard__stat-icono--azul">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
            </svg>
          </span>
          <div>
            <span>Próxima sesión</span>
            <strong>
              {{ proximasSesiones[0] ? fechaCorta(proximasSesiones[0].fecha) : '—' }}
            </strong>
            <p>{{ proximasSesiones[0]?.contenido || 'Sin programación próxima' }}</p>
          </div>
        </article>

        <article class="tarjeta dashboard__stat">
          <span class="dashboard__stat-icono dashboard__stat-icono--ambar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <div>
            <span>Notas por poner</span>
            <strong>{{ totalPendientes }}</strong>
            <p>{{ pendientesCorreccion.length }} entrega(s) con correcciones pendientes</p>
          </div>
        </article>

        <article class="tarjeta dashboard__stat">
          <span class="dashboard__stat-icono dashboard__stat-icono--rojo">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>
          <div>
            <span>Alumnado en riesgo</span>
            <strong>{{ totalRiesgo }}</strong>
            <p>con RA pendientes, incompletas o sin nota</p>
          </div>
        </article>

        <article class="tarjeta dashboard__stat">
          <span class="dashboard__stat-icono dashboard__stat-icono--violeta">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            </svg>
          </span>
          <div>
            <span>Próxima entrega</span>
            <strong>
              {{ proximasEntregas[0] ? fechaCorta(proximasEntregas[0].fecha_limite ?? '') : '—' }}
            </strong>
            <p>{{ proximasEntregas[0]?.titulo || 'Sin fechas próximas' }}</p>
          </div>
        </article>
      </section>

      <div class="dashboard__grid">
        <div class="dashboard__principal">
          <section class="tarjeta">
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Próximas sesiones</h3>
                <p class="tenue">Lo que toca en el aula</p>
              </div>
              <RouterLink
                :to="{ name: 'programacion', params: { grupoId: grupo.id } }"
                class="dashboard__enlace"
              >
                Ver programación
              </RouterLink>
            </header>

            <p v-if="proximasSesiones.length === 0" class="tenue">
              No hay sesiones programadas a partir de hoy.
            </p>
            <ul v-else class="dashboard__dias">
              <li v-for="sesion in proximasSesiones" :key="sesion.id">
                <span class="dashboard__fecha">{{ fechaCorta(sesion.fecha) }}</span>
                <span class="dashboard__contenido">{{ sesion.contenido || 'Sin contenido' }}</span>
                <span class="dashboard__dias-chips">
                  <span
                    v-if="sesion.desviacion && sesion.desviacion !== 'Sin desviación'"
                    class="chip chip--aviso"
                  >
                    {{ sesion.desviacion }}
                  </span>
                  <span v-if="sesion.hora" class="chip">{{ sesion.hora }}</span>
                  <span v-if="unidadDeSesion(sesion)" class="chip">
                    {{ unidadDeSesion(sesion)?.codigo ?? unidadDeSesion(sesion)?.nombre }}
                  </span>
                </span>
              </li>
            </ul>
          </section>

          <section class="tarjeta">
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Alumnado que necesita atención</h3>
                <p class="tenue">Los 5 casos más urgentes del grupo</p>
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

          <section class="tarjeta">
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Tareas pendientes</h3>
                <p class="tenue">Lo que pide atención ahora</p>
              </div>
            </header>
            <p v-if="tareasPendientes.length === 0" class="dashboard__ra-ok">
              Sin tareas pendientes.
            </p>
            <ul v-else class="dashboard__tareas">
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
          </section>
        </div>

        <aside class="dashboard__lateral">
          <section class="tarjeta">
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Agenda</h3>
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
              <div class="agenda-mini__barra">
                <button class="boton boton--sutil" type="button" @click="cambiarMesAgenda(-1)">
                  ←
                </button>
                <strong>{{ mesAgendaTexto }}</strong>
                <button class="boton boton--sutil" type="button" @click="cambiarMesAgenda(1)">
                  →
                </button>
                <button class="boton boton--sutil" type="button" @click="irMesActualAgenda">
                  Hoy
                </button>
              </div>

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
                  :title="
                    celda.items.length > 0
                      ? celda.items.map((item) => item.titulo).join(' · ')
                      : undefined
                  "
                >
                  <span class="agenda-mini__numero">{{ celda.dia }}</span>
                  <span v-if="celda.items.length > 0" class="agenda-mini__puntos">
                    <i
                      v-for="item in celda.items.slice(0, 4)"
                      :key="item.id"
                      class="agenda-punto"
                      :class="claseAgenda(item.tipo)"
                    ></i>
                  </span>
                </div>
              </div>
              <div class="agenda-mini__leyenda">
                <span><i class="agenda-punto agenda-punto--entrega"></i>Entrega</span>
                <span><i class="agenda-punto agenda-punto--examen"></i>Examen</span>
                <span><i class="agenda-punto agenda-punto--evaluacion"></i>Evaluación</span>
                <span><i class="agenda-punto agenda-punto--no-lectivo"></i>No lectivo</span>
              </div>
            </div>

            <p v-if="agendaProxima.length === 0" class="tenue">No hay hitos próximos.</p>
            <ul v-else class="dashboard__proximas-lista">
              <li v-for="item in agendaProxima" :key="item.id">
                <span class="dashboard__fecha">{{ fechaCorta(item.fecha) }}</span>
                <span class="dashboard__contenido">
                  <small v-if="item.hora" class="tenue">{{ item.hora }} · </small>
                  {{ item.titulo }}
                </span>
                <span
                  class="chip"
                  :class="{
                    'chip--aviso': item.tipo === 'examen',
                    'chip--ok': item.tipo === 'evaluacion'
                  }"
                >
                  {{ etiquetaAgenda(item.tipo) }}
                </span>
              </li>
            </ul>
          </section>

          <section class="tarjeta">
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

          <section class="tarjeta">
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
                <span>Horas registradas</span>
                <strong>{{ horasFormacion }}</strong>
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

          <section class="tarjeta">
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
        </aside>
      </div>
    </template>
  </section>
</template>

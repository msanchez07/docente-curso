<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import NavegacionMes from '@renderer/components/NavegacionMes.vue'
import MenuAcciones, { type AccionMenu } from '@renderer/components/MenuAcciones.vue'
import Modal from '@renderer/components/Modal.vue'
import AyudaSeccion from '@renderer/components/AyudaSeccion.vue'
import { notificar } from '@renderer/composables/notificaciones'
import { DIAS_SEMANA } from '@shared/grupos'
import type {
  EntregaClase,
  EventoEvaluacionClase,
  GrupoClase,
  TipoDiaCalendario
} from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import { useCursosAcademicosStore } from '@renderer/stores/cursos-academicos'

type TipoHito = 'entrega' | 'examen' | 'evaluacion' | 'no_lectivo'

interface HitoGeneral {
  id: string
  fecha: string
  hora: string | null
  titulo: string
  tipo: TipoHito
  grupoId: number | null
  grupoNombre: string
  moduloSiglas: string
  modalidad: GrupoClase['modalidad'] | null
  entregaId: number | null
}

interface ModuloCalendario {
  grupo: GrupoClase
  agenda: HitoGeneral[]
}

const grupoStore = useGruposClaseStore()
const cursos = useCursosAcademicosStore()
const modulos = ref<ModuloCalendario[]>([])
const calendario = ref<HitoGeneral[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const mesAgenda = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const filtroModulo = ref<number | null>(null)
const filtroTipo = ref<TipoHito | null>(null)
const mostrarImportar = ref(false)
const textoImportar = ref('')
const errorImportar = ref<string | null>(null)
const importando = ref(false)
const ficheroCalendario = ref<HTMLInputElement | null>(null)
const mostrarDefinir = ref(false)
const nuevoDia = ref({
  fecha: new Date().toISOString().slice(0, 10),
  tipo: 'festivo' as TipoDiaCalendario,
  descripcion: ''
})
const errorDia = ref<string | null>(null)
const guardandoDia = ref(false)

const TIPOS_CALENDARIO = [
  { id: 'entrega', etiqueta: 'Entregas' },
  { id: 'examen', etiqueta: 'Exámenes' },
  { id: 'evaluacion', etiqueta: 'Evaluaciones' },
  { id: 'no_lectivo', etiqueta: 'No lectivos' }
] as const

const PALETA_MODULOS = [
  '#2563eb',
  '#0891b2',
  '#7c3aed',
  '#db2777',
  '#d97706',
  '#16a34a',
  '#0f766e',
  '#9333ea',
  '#dc2626',
  '#475569',
  '#ca8a04',
  '#0369a1'
]

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
const diaSeleccionado = ref(hoy)

const grupos = computed(() =>
  grupoStore.grupos.filter((grupo) => grupo.curso_academico_id === cursos.activoId)
)

const agendaGeneral = computed(() =>
  [...modulos.value.flatMap((modulo) => modulo.agenda), ...calendario.value]
    .filter((item) => item.fecha >= hoy)
    .slice()
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
        a.titulo.localeCompare(b.titulo)
    )
)

const agendaFiltrada = computed(() =>
  agendaGeneral.value.filter((item) => {
    const moduloOk =
      filtroModulo.value === null ||
      item.tipo === 'no_lectivo' ||
      item.grupoId === filtroModulo.value
    const tipoOk = filtroTipo.value === null || item.tipo === filtroTipo.value
    return moduloOk && tipoOk
  })
)

const hitosDelDia = computed(() =>
  agendaFiltrada.value.filter((item) => item.fecha === diaSeleccionado.value)
)

const hitosDelMes = computed(() => {
  const prefijo = `${mesAgenda.value.getFullYear()}-${String(mesAgenda.value.getMonth() + 1).padStart(2, '0')}`
  return agendaFiltrada.value.filter((item) => item.fecha.startsWith(prefijo)).length
})

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
      items: agendaFiltrada.value.filter((item) => item.fecha === iso)
    }
  })
})

function colorModulo(grupoId: number): string {
  const indice = modulos.value.findIndex((modulo) => modulo.grupo.id === grupoId)
  return PALETA_MODULOS[(indice >= 0 ? indice : 0) % PALETA_MODULOS.length]
}

function claseDia(items: HitoGeneral[]): string {
  if (items.some((item) => item.tipo === 'no_lectivo')) return 'agenda-mini__celda--no-lectivo'
  if (items.some((item) => item.tipo === 'examen')) return 'agenda-mini__celda--examen'
  if (items.some((item) => item.tipo === 'evaluacion')) return 'agenda-mini__celda--evaluacion'
  if (items.some((item) => item.tipo === 'entrega')) return 'agenda-mini__celda--entrega'
  return ''
}

function seleccionarDia(fecha: string): void {
  diaSeleccionado.value = fecha
}

function fechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

function destinoHito(item: HitoGeneral): { name: string; params: Record<string, number> } {
  if (item.grupoId === null) return { name: 'calendario-curso', params: {} }
  if (item.tipo === 'entrega' && item.entregaId !== null) {
    return {
      name: 'entrega-notas',
      params: { grupoId: item.grupoId, entregaId: item.entregaId }
    }
  }
  if (item.tipo === 'examen' || item.tipo === 'evaluacion') {
    return { name: 'evaluaciones', params: { grupoId: item.grupoId } }
  }
  return { name: 'grupo', params: { id: item.grupoId } }
}

function cambiarMes(delta: number): void {
  const nuevo = new Date(mesAgenda.value.getFullYear(), mesAgenda.value.getMonth() + delta, 1)
  mesAgenda.value = nuevo
  const prefijo = `${nuevo.getFullYear()}-${String(nuevo.getMonth() + 1).padStart(2, '0')}`
  diaSeleccionado.value =
    agendaFiltrada.value.find((item) => item.fecha.startsWith(prefijo))?.fecha ?? isoLocal(nuevo)
}

function irMesActual(): void {
  const ahora = new Date()
  mesAgenda.value = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  diaSeleccionado.value = hoy
}

function hitosDeGrupo(
  grupo: GrupoClase,
  entregas: EntregaClase[],
  eventos: EventoEvaluacionClase[]
): HitoGeneral[] {
  const items = new Map<string, HitoGeneral>()
  const clave = (fecha: string, titulo: string): string => `${fecha}|${titulo.toLowerCase()}`

  for (const evento of eventos) {
    const tipo: TipoHito = evento.tipo === 'examen' ? 'examen' : 'evaluacion'
    items.set(clave(evento.fecha, evento.titulo), {
      id: `evento-${evento.id}-${grupo.id}`,
      fecha: evento.fecha,
      hora: evento.hora,
      titulo: evento.titulo,
      tipo,
      grupoId: grupo.id,
      grupoNombre: grupo.nombre,
      moduloSiglas: grupo.modulo_siglas,
      modalidad: grupo.modalidad,
      entregaId: null
    })
  }

  for (const entrega of entregas) {
    if (!entrega.fecha_limite) continue
    const entrada = clave(entrega.fecha_limite, entrega.titulo)
    if (items.has(entrada)) continue
    items.set(entrada, {
      id: `entrega-${entrega.id}-${grupo.id}`,
      fecha: entrega.fecha_limite,
      hora: null,
      titulo: entrega.titulo,
      tipo: 'entrega',
      grupoId: grupo.id,
      grupoNombre: grupo.nombre,
      moduloSiglas: grupo.modulo_siglas,
      modalidad: grupo.modalidad,
      entregaId: entrega.id
    })
  }

  return [...items.values()].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
      a.titulo.localeCompare(b.titulo)
  )
}

function accionesCalendario(): AccionMenu[] {
  return [
    { id: 'imprimir', etiqueta: 'Imprimir / PDF', icono: 'descargar' },
    { id: 'ics', etiqueta: 'Descargar .ics', icono: 'descargar' },
    { id: 'importar', etiqueta: 'Importar calendario escolar', icono: 'importar' },
    { id: 'definir', etiqueta: 'Definir día no lectivo', icono: 'programacion' }
  ]
}

function ejecutarAccionCalendario(accion: string): void {
  if (accion === 'imprimir') imprimirCalendario()
  else if (accion === 'ics') descargarIcs()
  else if (accion === 'importar') abrirImportar()
  else if (accion === 'definir') abrirDefinir()
}

function abrirImportar(): void {
  textoImportar.value = ''
  errorImportar.value = null
  mostrarImportar.value = true
}

function abrirDefinir(): void {
  errorDia.value = null
  nuevoDia.value = {
    fecha: hoy,
    tipo: 'festivo',
    descripcion: ''
  }
  mostrarDefinir.value = true
}

async function importarCalendarioTexto(texto: string): Promise<void> {
  const cursoId = cursos.activo?.id
  if (!cursoId || !texto.trim()) return
  importando.value = true
  errorImportar.value = null
  try {
    const resultado = await window.api.calendarioEscolar.importar(cursoId, texto)
    if (resultado.creados === 0) {
      errorImportar.value = resultado.errores.join(' · ') || 'No se ha importado ningún día.'
      return
    }
    await recargarCalendario()
    mostrarImportar.value = false
    notificar(`${resultado.creados} día(s) del calendario importados.`)
    if (resultado.errores.length > 0) errorImportar.value = resultado.errores.join(' · ')
  } catch (e) {
    errorImportar.value = (e as Error).message ?? String(e)
  } finally {
    importando.value = false
  }
}

async function alElegirCalendario(evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement
  const archivo = entrada.files?.[0]
  if (!archivo) return
  try {
    textoImportar.value = await archivo.text()
  } finally {
    entrada.value = ''
  }
}

async function guardarDiaCalendario(): Promise<void> {
  const cursoId = cursos.activo?.id
  if (!cursoId) return
  if (!nuevoDia.value.fecha) {
    errorDia.value = 'Indica una fecha.'
    return
  }
  guardandoDia.value = true
  errorDia.value = null
  try {
    const actuales = await window.api.calendarioEscolar.listar(cursoId)
    const dias = actuales
      .filter((dia) => dia.fecha !== nuevoDia.value.fecha)
      .map((dia) => ({ fecha: dia.fecha, tipo: dia.tipo, descripcion: dia.descripcion }))
    dias.push({
      fecha: nuevoDia.value.fecha,
      tipo: nuevoDia.value.tipo,
      descripcion: nuevoDia.value.descripcion.trim() || null
    })
    await window.api.calendarioEscolar.importar(cursoId, JSON.stringify({ dias }))
    await recargarCalendario()
    mostrarDefinir.value = false
    notificar('Día añadido al calendario.')
  } catch (e) {
    errorDia.value = (e as Error).message ?? String(e)
  } finally {
    guardandoDia.value = false
  }
}

function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function imprimirCalendario(): void {
  const filas: string[] = []
  for (let i = 0; i < celdasAgenda.value.length; i += 7) {
    const dias = celdasAgenda.value.slice(i, i + 7)
    filas.push(
      `<tr>${dias
        .map((celda) => {
          const eventos = celda.esMes
            ? celda.items
                .map(
                  (item) =>
                    `<div class="evento evento--${item.tipo}">${escapar(item.moduloSiglas)} · ${escapar(item.titulo)}</div>`
                )
                .join('')
            : ''
          return `<td class="${celda.esMes ? '' : 'fuera'}"><strong>${celda.dia}</strong>${eventos}</td>`
        })
        .join('')}</tr>`
    )
  }
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Calendario · ${escapar(mesAgendaTexto.value)}</title>
  <style>@page{size:A4 landscape;margin:10mm}body{font:10px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d2939}h1{font-size:18px;margin:0 0 3px}p{margin:0 0 10px;color:#667085}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #dbe5ee;vertical-align:top;padding:5px;height:78px}th{background:#eef4f8;color:#36536b;font-size:8px;text-transform:uppercase}td{font-size:9px}td.fuera{background:#f8fafc;color:#98a2b3}td>strong{display:block;margin-bottom:4px;font-size:11px}.evento{margin:2px 0;padding:2px 4px;border-left:3px solid #2563eb;background:#f5f9ff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.evento--examen{border-color:#d98a2b;background:#fffbf0}.evento--evaluacion{border-color:#067647;background:#f4fdf8}.evento--no_lectivo{border-color:#b42318;background:#fef3f2}</style></head><body>
  <h1>Calendario del curso · ${escapar(mesAgendaTexto.value)}</h1>
  <p>${modulos.value.map((modulo) => `${escapar(modulo.grupo.modulo_siglas)} (${escapar(modulo.grupo.modalidad)})`).join(' · ')}</p>
  <table><thead><tr>${DIAS_SEMANA.map((dia) => `<th>${dia.corto}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table>
  </body></html>`
  const ventana = window.open('', 'calendario-curso', 'width=1200,height=900')
  if (!ventana) return
  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
  window.setTimeout(() => ventana.print(), 250)
}

function escaparIcs(texto: string): string {
  return texto
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n')
}

function fechaIcs(fecha: string, hora?: string | null): string {
  const base = fecha.replaceAll('-', '')
  return hora ? `${base}T${hora.replace(':', '')}00` : base
}

function descargarIcs(): void {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aula Nova//Calendario//ES',
    'CALSCALE:GREGORIAN'
  ]
  const sello = `${new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')}`
  for (const item of agendaFiltrada.value) {
    lineas.push('BEGIN:VEVENT')
    lineas.push(`UID:${item.id}@docente-curso`)
    lineas.push(`DTSTAMP:${sello}`)
    if (item.hora) {
      const inicio = new Date(`${item.fecha}T${item.hora}:00`)
      const fin = new Date(inicio.getTime() + 60 * 60 * 1000)
      const finFecha = isoLocal(fin)
      const finHora = `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`
      lineas.push(`DTSTART:${fechaIcs(item.fecha, item.hora)}`)
      lineas.push(`DTEND:${fechaIcs(finFecha, finHora)}`)
    } else {
      const fin = sumarDias(new Date(`${item.fecha}T00:00:00`), 1)
      lineas.push(`DTSTART;VALUE=DATE:${fechaIcs(item.fecha)}`)
      lineas.push(`DTEND;VALUE=DATE:${fechaIcs(isoLocal(fin))}`)
    }
    lineas.push(`SUMMARY:${escaparIcs(`${item.moduloSiglas} · ${item.titulo}`)}`)
    lineas.push(`DESCRIPTION:${escaparIcs(item.grupoNombre)}`)
    lineas.push('END:VEVENT')
  }
  lineas.push('END:VCALENDAR')
  const blob = new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'calendario-curso.ics'
  enlace.click()
  URL.revokeObjectURL(url)
  notificar('Calendario descargado en formato .ics.')
}

async function recargarCalendario(): Promise<void> {
  const cursoId = cursos.activo?.id
  if (!cursoId) {
    calendario.value = []
    return
  }
  const diasCalendario = await window.api.calendarioEscolar.listar(cursoId)
  calendario.value = diasCalendario
    .filter((dia) => dia.tipo !== 'lectivo')
    .map((dia) => ({
      id: `calendario-${dia.id}`,
      fecha: dia.fecha,
      hora: null,
      titulo:
        dia.descripcion ||
        (dia.tipo === 'vacaciones'
          ? 'Vacaciones'
          : dia.tipo === 'festivo'
            ? 'Festivo'
            : 'Día no lectivo'),
      tipo: 'no_lectivo' as const,
      grupoId: null,
      grupoNombre: 'Calendario',
      moduloSiglas: 'Curso',
      modalidad: null,
      entregaId: null
    }))
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await Promise.all([grupoStore.cargar(), cursos.cargar()])
    const activos = grupos.value
    if (activos.length === 0) {
      modulos.value = []
      return
    }

    modulos.value = await Promise.all(
      activos.map(async (grupo) => {
        const [entregas, eventos] = await Promise.all([
          window.api.entregasClase.listar(grupo.id),
          window.api.eventosEvaluacion.listar(grupo.id)
        ])
        return {
          grupo,
          agenda: hitosDeGrupo(grupo, entregas, eventos)
        }
      })
    )

    await recargarCalendario()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section class="vista vista--ancha calendario-curso">
    <header class="vista__cabecera">
      <div>
        <p class="dashboard__eyebrow">Curso {{ cursos.activo?.nombre }}</p>
        <h2>Calendario del curso</h2>
        <p class="tenue">Calendario de todos los módulos del curso.</p>
      </div>
    </header>

    <div v-if="cargando" class="vacio">Cargando el calendario del curso…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <p v-else-if="modulos.length === 0" class="vacio">No hay módulos en este curso académico.</p>

    <section v-else class="tarjeta dashboard__calendario-general">
      <header class="dashboard__tarjeta-cabecera">
        <div>
          <p class="tenue">
            {{ hitosDelMes }} {{ hitosDelMes === 1 ? 'hito' : 'hitos' }} en {{ mesAgendaTexto }} ·
            entregas, exámenes, evaluaciones y no lectivos
          </p>
        </div>
        <div class="dashboard__calendario-acciones">
          <div class="dashboard__leyenda-modalidad" aria-label="Modalidad de los módulos">
            <span>
              <i class="dashboard__punto-modalidad dashboard__punto-modalidad--presencial"></i>
              Presencial
            </span>
            <span>
              <i class="dashboard__punto-modalidad dashboard__punto-modalidad--semipresencial"></i>
              Semipresencial
            </span>
          </div>
          <AyudaSeccion />
          <MenuAcciones
            texto="Acciones"
            :acciones="accionesCalendario()"
            @accion="ejecutarAccionCalendario"
          />
        </div>
      </header>

      <div class="dashboard__modulos-leyenda" aria-label="Filtrar por módulo">
        <strong>Módulos:</strong>
        <button
          type="button"
          class="dashboard__modulo-leyenda"
          :class="{ 'dashboard__modulo-leyenda--activo': filtroModulo === null }"
          @click="filtroModulo = null"
        >
          Todos
        </button>
        <button
          v-for="modulo in modulos"
          :key="modulo.grupo.id"
          type="button"
          class="dashboard__modulo-leyenda"
          :class="{ 'dashboard__modulo-leyenda--activo': filtroModulo === modulo.grupo.id }"
          @click="filtroModulo = filtroModulo === modulo.grupo.id ? null : modulo.grupo.id"
        >
          <i :style="{ background: colorModulo(modulo.grupo.id) }"></i>
          {{ modulo.grupo.modulo_siglas }}
        </button>
      </div>

      <div class="dashboard__filtros-tipo" aria-label="Filtrar por tipo de hito">
        <span class="tenue">Ver:</span>
        <button
          type="button"
          class="dashboard__filtro-tipo"
          :class="{ 'dashboard__filtro-tipo--activo': filtroTipo === null }"
          @click="filtroTipo = null"
        >
          Todos
        </button>
        <button
          v-for="tipo in TIPOS_CALENDARIO"
          :key="tipo.id"
          type="button"
          class="dashboard__filtro-tipo"
          :class="{ 'dashboard__filtro-tipo--activo': filtroTipo === tipo.id }"
          @click="filtroTipo = filtroTipo === tipo.id ? null : tipo.id"
        >
          <i
            class="agenda-mini__muestra"
            :class="`agenda-mini__muestra--${tipo.id.replace('_', '-')}`"
          ></i>
          {{ tipo.etiqueta }}
        </button>
      </div>

      <div class="agenda-mini calendario-general">
        <NavegacionMes
          class="agenda-mini__barra"
          :etiqueta="mesAgendaTexto"
          @anterior="cambiarMes(-1)"
          @siguiente="cambiarMes(1)"
          @hoy="irMesActual"
        />

        <div class="calendario-general__grid">
          <span
            v-for="dia in DIAS_SEMANA"
            :key="`general-cabecera-${dia.valor}`"
            class="agenda-mini__dia-semana"
          >
            {{ dia.corto }}
          </span>
          <div
            v-for="celda in celdasAgenda"
            :key="celda.fecha"
            class="agenda-mini__celda calendario-general__celda"
            :class="[
              claseDia(celda.items),
              {
                'agenda-mini__celda--fuera': !celda.esMes,
                'agenda-mini__celda--hoy': celda.esHoy,
                'calendario-general__celda--seleccionada': celda.fecha === diaSeleccionado
              }
            ]"
            :aria-current="celda.esHoy ? 'date' : undefined"
            tabindex="0"
            @click="seleccionarDia(celda.fecha)"
            @keydown.enter.prevent="seleccionarDia(celda.fecha)"
            @keydown.space.prevent="seleccionarDia(celda.fecha)"
          >
            <span class="agenda-mini__numero calendario-general__numero">{{ celda.dia }}</span>
            <span class="calendario-general__eventos">
              <template v-for="(item, indice) in celda.items.slice(0, 2)" :key="item.id">
                <RouterLink
                  v-if="item.grupoId"
                  :to="destinoHito(item)"
                  class="calendario-general__evento"
                  :style="{ borderLeftColor: colorModulo(item.grupoId) }"
                  :title="`${item.grupoNombre}: ${item.titulo}`"
                >
                  <strong>{{ item.moduloSiglas }}</strong> {{ item.titulo }}
                </RouterLink>
                <span v-else class="calendario-general__evento calendario-general__evento--curso">
                  {{ item.titulo }}
                </span>
                <span
                  v-if="indice === celda.items.slice(0, 2).length - 1 && celda.items.length > 2"
                  class="calendario-general__mas"
                >
                  +{{ celda.items.length - 2 }}
                </span>
              </template>
            </span>
          </div>
        </div>

        <div class="agenda-mini__leyenda">
          <span> <i class="agenda-mini__muestra agenda-mini__muestra--entrega"></i>Entrega </span>
          <span> <i class="agenda-mini__muestra agenda-mini__muestra--examen"></i>Examen </span>
          <span>
            <i class="agenda-mini__muestra agenda-mini__muestra--evaluacion"></i>Evaluación
          </span>
          <span>
            <i class="agenda-mini__muestra agenda-mini__muestra--no-lectivo"></i>No lectivo
          </span>
        </div>
      </div>

      <section class="dashboard__dia-seleccionado" aria-live="polite">
        <header class="dashboard__dia-cabecera">
          <div>
            <p class="dashboard__eyebrow">Día seleccionado</p>
            <h4>{{ fechaLarga(diaSeleccionado) }}</h4>
          </div>
          <span class="chip">
            {{ hitosDelDia.length }} {{ hitosDelDia.length === 1 ? 'hito' : 'hitos' }}
          </span>
        </header>

        <p v-if="hitosDelDia.length === 0" class="tenue">
          No hay entregas, exámenes, evaluaciones ni días no lectivos.
        </p>
        <ul v-else class="dashboard__dia-lista">
          <li v-for="item in hitosDelDia" :key="item.id">
            <span class="dashboard__fecha" :class="`dashboard__fecha--${item.tipo}`">
              {{ item.hora || 'Todo el día' }}
            </span>
            <span class="dashboard__contenido">
              <strong>{{ item.titulo }}</strong>
              <span class="tenue">{{ item.grupoNombre }}</span>
            </span>
            <RouterLink v-if="item.grupoId" :to="destinoHito(item)" class="dashboard__enlace">
              Abrir
            </RouterLink>
          </li>
        </ul>
      </section>
    </section>

    <Modal
      v-if="mostrarImportar"
      titulo="Importar calendario escolar"
      ancho="ancho"
      @cerrar="mostrarImportar = false"
    >
      <p class="tenue">
        Acepta un array de días, <span class="monospace">{ "dias": [...] }</span> o listas por tipo.
        Al importar se sustituye el calendario del curso.
      </p>
      <div class="barra">
        <button class="boton" type="button" @click="ficheroCalendario?.click()">
          Elegir fichero…
        </button>
        <input
          ref="ficheroCalendario"
          hidden
          type="file"
          accept=".json,application/json"
          @change="alElegirCalendario"
        />
        <span class="tenue">o pega el JSON abajo</span>
      </div>
      <textarea
        v-model="textoImportar"
        rows="8"
        class="monospace"
        placeholder='{
  "festivos": ["2026-11-02", "2026-12-07"],
  "vacaciones": ["2026-12-23"]
}'
      ></textarea>
      <p v-if="errorImportar" class="aviso aviso--error" role="alert">{{ errorImportar }}</p>
      <template #pie>
        <button class="boton" type="button" @click="mostrarImportar = false">Cancelar</button>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="importando || !textoImportar.trim()"
          @click="importarCalendarioTexto(textoImportar)"
        >
          {{ importando ? 'Importando…' : 'Importar' }}
        </button>
      </template>
    </Modal>

    <Modal v-if="mostrarDefinir" titulo="Definir día no lectivo" @cerrar="mostrarDefinir = false">
      <div class="formulario">
        <div class="campo">
          <label for="calendario-fecha">Fecha</label>
          <input id="calendario-fecha" v-model="nuevoDia.fecha" type="date" />
        </div>
        <div class="campo">
          <label for="calendario-tipo">Tipo</label>
          <select id="calendario-tipo" v-model="nuevoDia.tipo">
            <option value="festivo">Festivo</option>
            <option value="no_lectivo">No lectivo</option>
            <option value="vacaciones">Vacaciones</option>
          </select>
        </div>
        <div class="campo campo--ancho">
          <label for="calendario-descripcion">Descripción</label>
          <input
            id="calendario-descripcion"
            v-model="nuevoDia.descripcion"
            type="text"
            placeholder="Ej.: Fiesta local"
          />
        </div>
      </div>
      <p v-if="errorDia" class="aviso aviso--error" role="alert">{{ errorDia }}</p>
      <template #pie>
        <button class="boton" type="button" @click="mostrarDefinir = false">Cancelar</button>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="guardandoDia || !nuevoDia.fecha"
          @click="guardarDiaCalendario"
        >
          {{ guardandoDia ? 'Guardando…' : 'Añadir día' }}
        </button>
      </template>
    </Modal>
  </section>
</template>

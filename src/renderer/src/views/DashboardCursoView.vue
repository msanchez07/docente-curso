<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import NavegacionMes from '@renderer/components/NavegacionMes.vue'
import { DIAS_SEMANA } from '@shared/grupos'
import type { EntregaClase, EventoEvaluacionClase, GrupoClase } from '@shared/tipos'
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
      items: agendaGeneral.value.filter((item) => item.fecha === iso)
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

function cambiarMes(delta: number): void {
  mesAgenda.value = new Date(mesAgenda.value.getFullYear(), mesAgenda.value.getMonth() + delta, 1)
}

function irMesActual(): void {
  const ahora = new Date()
  mesAgenda.value = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
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
      modalidad: grupo.modalidad
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
      modalidad: grupo.modalidad
    })
  }

  return [...items.values()].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
      a.titulo.localeCompare(b.titulo)
  )
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

    const diasCalendario = await window.api.calendarioEscolar.listar(activos[0].curso_academico_id)
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
        modalidad: null
      }))
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section class="vista vista--ancha dashboard-curso">
    <header class="vista__cabecera">
      <div>
        <p class="dashboard__eyebrow">Curso {{ cursos.activo?.nombre }}</p>
        <h2>Dashboard del curso</h2>
        <p class="tenue">Calendario de todos los módulos del curso.</p>
      </div>
    </header>

    <div v-if="cargando" class="vacio">Cargando el calendario del curso…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <p v-else-if="modulos.length === 0" class="vacio">No hay módulos en este curso académico.</p>

    <section v-else class="tarjeta dashboard__calendario-general">
      <header class="dashboard__tarjeta-cabecera">
        <div>
          <h3>Calendario del curso</h3>
          <p class="tenue">Entregas, exámenes, evaluaciones y no lectivos de todos los módulos</p>
        </div>
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
      </header>

      <div class="dashboard__modulos-leyenda">
        <strong>Módulos:</strong>
        <RouterLink
          v-for="modulo in modulos"
          :key="modulo.grupo.id"
          :to="{ name: 'grupo', params: { id: modulo.grupo.id } }"
          class="dashboard__modulo-leyenda"
        >
          <i :style="{ background: colorModulo(modulo.grupo.id) }"></i>
          {{ modulo.grupo.modulo_siglas }}
        </RouterLink>
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
                'agenda-mini__celda--hoy': celda.esHoy
              }
            ]"
            :aria-current="celda.esHoy ? 'date' : undefined"
          >
            <span class="agenda-mini__numero calendario-general__numero">{{ celda.dia }}</span>
            <span class="calendario-general__eventos">
              <template v-for="(item, indice) in celda.items.slice(0, 2)" :key="item.id">
                <RouterLink
                  v-if="item.grupoId"
                  :to="{ name: 'grupo', params: { id: item.grupoId } }"
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
    </section>
  </section>
</template>

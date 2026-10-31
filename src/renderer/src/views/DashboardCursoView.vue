<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import NavegacionMes from '@renderer/components/NavegacionMes.vue'
import { calcularResumenClase } from '@shared/calcular-calificaciones'
import { DIAS_SEMANA } from '@shared/grupos'
import type {
  CriterioDisponible,
  EntregaClase,
  EventoEvaluacionClase,
  FilaCalificacionClase,
  GrupoClase,
  ProgramacionAula
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
}

interface ModuloResumen {
  grupo: GrupoClase
  programacion: ProgramacionAula[]
  proximaSesion: ProgramacionAula | null
  agenda: HitoGeneral[]
  proximoHito: HitoGeneral | null
  pendientes: { entrega: EntregaClase; pendientes: number }[]
  totalPendientes: number
  riesgo: FilaCalificacionClase[]
  totalRiesgo: number
}

const grupoStore = useGruposClaseStore()
const cursos = useCursosAcademicosStore()
const modulos = ref<ModuloResumen[]>([])
const calendario = ref<HitoGeneral[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const mesAgenda = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

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

const grupos = computed(() =>
  grupoStore.grupos.filter((grupo) => grupo.curso_academico_id === cursos.activoId)
)

const totalPendientes = computed(() =>
  modulos.value.reduce((total, modulo) => total + modulo.totalPendientes, 0)
)

const totalRiesgo = computed(() =>
  modulos.value.reduce((total, modulo) => total + modulo.totalRiesgo, 0)
)

const modulosConRiesgo = computed(
  () => modulos.value.filter((modulo) => modulo.totalRiesgo > 0).length
)

const modulosPorCurso = computed(() => {
  const porCurso = new Map<string, ModuloResumen[]>()
  for (const modulo of modulos.value) {
    const lista = porCurso.get(modulo.grupo.curso) ?? []
    lista.push(modulo)
    porCurso.set(modulo.grupo.curso, lista)
  }
  return [...porCurso.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([curso, lista]) => ({
      curso,
      modulos: lista
        .slice()
        .sort((a, b) => a.grupo.modulo_siglas.localeCompare(b.grupo.modulo_siglas))
    }))
})

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

const proximasFechas = computed(() => agendaGeneral.value.slice(0, 10))

const colaTrabajo = computed(() =>
  modulos.value
    .flatMap((modulo) =>
      modulo.pendientes.map((item) => ({
        ...item,
        grupo: modulo.grupo
      }))
    )
    .sort((a, b) => b.pendientes - a.pendientes)
    .slice(0, 6)
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

function claseDia(items: HitoGeneral[]): string {
  if (items.some((item) => item.tipo === 'no_lectivo')) return 'agenda-mini__celda--no-lectivo'
  if (items.some((item) => item.tipo === 'examen')) return 'agenda-mini__celda--examen'
  if (items.some((item) => item.tipo === 'evaluacion')) return 'agenda-mini__celda--evaluacion'
  if (items.some((item) => item.tipo === 'entrega')) return 'agenda-mini__celda--entrega'
  return ''
}

function colorModulo(grupoId: number): string {
  const indice = modulos.value.findIndex((modulo) => modulo.grupo.id === grupoId)
  return PALETA_MODULOS[(indice >= 0 ? indice : 0) % PALETA_MODULOS.length]
}

function modulosDeCelda(
  items: HitoGeneral[]
): { grupoId: number; siglas: string; color: string }[] {
  const vistos = new Set<number>()
  const resultado: { grupoId: number; siglas: string; color: string }[] = []
  for (const item of items) {
    if (item.grupoId === null || vistos.has(item.grupoId)) continue
    vistos.add(item.grupoId)
    resultado.push({
      grupoId: item.grupoId,
      siglas: item.moduloSiglas,
      color: colorModulo(item.grupoId)
    })
  }
  return resultado
}

function cambiarMes(delta: number): void {
  mesAgenda.value = new Date(mesAgenda.value.getFullYear(), mesAgenda.value.getMonth() + delta, 1)
}

function irMesActual(): void {
  const ahora = new Date()
  mesAgenda.value = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
}

function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
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
      id: `evento-${evento.id}`,
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
      id: `entrega-${entrega.id}`,
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

    const resultados = await Promise.all(
      activos.map(async (grupo) => {
        const [programacion, modelo, entregas, alumnos, notas, criterios, eventos, unidades] =
          await Promise.all([
            window.api.programacion.listar(grupo.id),
            window.api.criterios.obtener(grupo.id),
            window.api.entregasClase.listar(grupo.id),
            window.api.alumnosClase.listar(grupo.id),
            window.api.notasClase.listar(grupo.id),
            window.api.entregasClase.criterios(grupo.id),
            window.api.eventosEvaluacion.listar(grupo.id),
            window.api.unidadesProgramacion.listar(grupo.id)
          ])

        const resumen = modelo
          ? calcularResumenClase(
              grupo,
              modelo,
              entregas,
              alumnos,
              notas,
              criterios as CriterioDisponible[],
              unidades
            )
          : null

        const activosAlumnos = alumnos.filter((alumno) => alumno.activo)
        const pendientes = entregas
          .map((entrega) => {
            const conNota = new Set(
              notas
                .filter((nota) => nota.entrega_id === entrega.id && nota.nota !== null)
                .map((nota) => nota.alumno_id)
            )
            const cuenta = activosAlumnos.filter((alumno) => !conNota.has(alumno.id)).length
            return { entrega, pendientes: cuenta }
          })
          .filter((item) => item.pendientes > 0)
          .sort((a, b) => b.pendientes - a.pendientes)

        const riesgo = (resumen?.alumnos ?? [])
          .filter(
            (fila) => fila.rasNoSuperados.length > 0 || fila.incompleta || fila.notaFinal === null
          )
          .sort((a, b) => (a.notaFinal ?? -1) - (b.notaFinal ?? -1))

        const agenda = hitosDeGrupo(grupo, entregas, eventos)
        const proxima = programacion
          .filter((sesion) => sesion.fecha >= hoy)
          .slice()
          .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)[0]

        return {
          grupo,
          programacion,
          proximaSesion: proxima ?? null,
          agenda,
          proximoHito: agenda.find((item) => item.fecha >= hoy) ?? null,
          pendientes,
          totalPendientes: pendientes.reduce((total, item) => total + item.pendientes, 0),
          riesgo,
          totalRiesgo: riesgo.length
        } satisfies ModuloResumen
      })
    )
    modulos.value = resultados

    const diasCalendario = await window.api.calendarioEscolar.listar(activos[0].curso_academico_id)
    calendario.value = diasCalendario
      .filter((dia) => dia.tipo !== 'lectivo' && dia.fecha >= hoy)
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
        <p class="tenue">
          Todos los módulos del curso, con sus próximas fechas, pendientes y riesgo agregado.
        </p>
      </div>
    </header>

    <div v-if="cargando" class="vacio">Cargando el panel general…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else>
      <p v-if="modulos.length === 0" class="vacio">No hay módulos en este curso académico.</p>

      <template v-else>
        <section class="dashboard__stats dashboard__general-stats">
          <article class="tarjeta dashboard__stat-general">
            <span>Módulos</span>
            <strong>{{ modulos.length }}</strong>
            <p>Grupos activos del curso</p>
          </article>
          <article class="tarjeta dashboard__stat-general">
            <span>Módulos con riesgo</span>
            <strong>{{ modulosConRiesgo }}</strong>
            <p>Módulos con casos pendientes</p>
          </article>
          <article class="tarjeta dashboard__stat-general">
            <span>Pendiente de corregir</span>
            <strong>{{ totalPendientes }}</strong>
            <p>Notas sin poner</p>
          </article>
          <article class="tarjeta dashboard__stat-general">
            <span>En riesgo</span>
            <strong>{{ totalRiesgo }}</strong>
            <p>Casos entre todos los módulos</p>
          </article>
        </section>

        <div class="dashboard__grid">
          <div class="dashboard__principal">
            <section class="tarjeta">
              <header class="dashboard__tarjeta-cabecera">
                <div>
                  <h3>Módulos</h3>
                  <p class="tenue">Resumen de cada grupo del curso</p>
                </div>
                <div class="dashboard__leyenda-modalidad" aria-label="Modalidad de los módulos">
                  <span>
                    <i
                      class="dashboard__punto-modalidad dashboard__punto-modalidad--presencial"
                    ></i>
                    Presencial
                  </span>
                  <span>
                    <i
                      class="dashboard__punto-modalidad dashboard__punto-modalidad--semipresencial"
                    ></i>
                    Semipresencial
                  </span>
                </div>
              </header>

              <div class="dashboard__cursos">
                <section
                  v-for="bloque in modulosPorCurso"
                  :key="bloque.curso"
                  class="dashboard__curso-bloque"
                >
                  <h4 class="dashboard__curso-titulo">{{ bloque.curso }}º curso</h4>
                  <div class="tabla-scroll">
                    <table class="tabla tabla--compacta dashboard__modulos-tabla">
                      <thead>
                        <tr>
                          <th>Módulo</th>
                          <th>Próxima sesión</th>
                          <th>Próximo hito</th>
                          <th class="num">Pendientes</th>
                          <th class="num">Riesgo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="modulo in bloque.modulos"
                          :key="modulo.grupo.id"
                          :class="`dashboard__modulo-fila--${modulo.grupo.modalidad}`"
                        >
                          <td>
                            <span class="dashboard__modulo-nombre">
                              <strong>{{ modulo.grupo.modulo_siglas }}</strong>
                              <small class="tenue">{{ modulo.grupo.modulo_nombre }}</small>
                            </span>
                          </td>
                          <td>
                            <span v-if="modulo.proximaSesion">
                              {{ fechaCorta(modulo.proximaSesion.fecha) }}
                              <template v-if="modulo.proximaSesion.hora">
                                · {{ modulo.proximaSesion.hora }}
                              </template>
                              <small class="tenue dashboard__modulo-sesion">
                                {{ modulo.proximaSesion.contenido || 'Sin contenido' }}
                              </small>
                            </span>
                            <span v-else class="tenue">—</span>
                          </td>
                          <td>
                            <span v-if="modulo.proximoHito">
                              {{ fechaCorta(modulo.proximoHito.fecha) }}
                              <small class="tenue dashboard__modulo-sesion">
                                {{ modulo.proximoHito.titulo }}
                              </small>
                            </span>
                            <span v-else class="tenue">—</span>
                          </td>
                          <td class="num">
                            <span
                              class="chip"
                              :class="{ 'chip--aviso': modulo.totalPendientes > 0 }"
                            >
                              {{ modulo.totalPendientes }}
                            </span>
                          </td>
                          <td class="num">
                            <span class="chip" :class="{ 'chip--aviso': modulo.totalRiesgo > 0 }">
                              {{ modulo.totalRiesgo }}
                            </span>
                          </td>
                          <td class="acciones">
                            <RouterLink
                              :to="{ name: 'grupo', params: { id: modulo.grupo.id } }"
                              class="dashboard__enlace"
                            >
                              Abrir
                            </RouterLink>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </section>

            <section class="tarjeta">
              <header class="dashboard__tarjeta-cabecera">
                <div>
                  <h3>Cola de trabajo</h3>
                  <p class="tenue">Entregas con más notas pendientes entre todos los módulos</p>
                </div>
              </header>

              <p v-if="colaTrabajo.length === 0" class="dashboard__ra-ok">
                No hay notas pendientes.
              </p>
              <ul v-else class="dashboard__tareas dashboard__tareas--general">
                <li v-for="item in colaTrabajo" :key="`${item.grupo.id}-${item.entrega.id}`">
                  <span class="dashboard__tarea-punto" aria-hidden="true"></span>
                  <span>
                    {{ item.entrega.titulo }}
                    <small class="tenue">{{ item.grupo.modulo_siglas }}</small>
                  </span>
                  <span class="chip chip--aviso">{{ item.pendientes }} pendientes</span>
                  <RouterLink
                    :to="{
                      name: 'entrega-notas',
                      params: { grupoId: item.grupo.id, entregaId: item.entrega.id }
                    }"
                    class="dashboard__enlace"
                  >
                    Corregir
                  </RouterLink>
                </li>
              </ul>
            </section>
          </div>

          <aside class="dashboard__lateral">
            <section class="tarjeta">
              <header class="dashboard__tarjeta-cabecera">
                <div>
                  <h3>Calendario general</h3>
                  <p class="tenue">Entregas, exámenes, evaluaciones y no lectivos</p>
                </div>
              </header>

              <div class="agenda-mini">
                <NavegacionMes
                  class="agenda-mini__barra"
                  :etiqueta="mesAgendaTexto"
                  @anterior="cambiarMes(-1)"
                  @siguiente="cambiarMes(1)"
                  @hoy="irMesActual"
                />

                <div class="agenda-mini__grid">
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
                    class="agenda-mini__celda"
                    :class="[
                      claseDia(celda.items),
                      {
                        'agenda-mini__celda--fuera': !celda.esMes,
                        'agenda-mini__celda--hoy': celda.esHoy
                      }
                    ]"
                    :title="celda.items.map((item) => item.titulo).join(' · ') || undefined"
                    :aria-current="celda.esHoy ? 'date' : undefined"
                  >
                    <span class="agenda-mini__numero">{{ celda.dia }}</span>
                    <span
                      v-if="modulosDeCelda(celda.items).length > 0"
                      class="agenda-mini__modulos"
                    >
                      <span
                        v-for="modulo in modulosDeCelda(celda.items).slice(0, 3)"
                        :key="`${celda.fecha}-${modulo.grupoId}`"
                        class="agenda-mini__modulo-barra"
                        :style="{ background: modulo.color }"
                        :title="modulo.siglas"
                      ></span>
                      <span
                        v-if="modulosDeCelda(celda.items).length > 3"
                        class="agenda-mini__modulo-mas"
                        :title="`${modulosDeCelda(celda.items).length} módulos`"
                      >
                        +{{ modulosDeCelda(celda.items).length - 3 }}
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

              <div class="dashboard__modulos-leyenda">
                <strong>Módulos:</strong>
                <span v-for="modulo in modulos" :key="modulo.grupo.id">
                  <i :style="{ background: colorModulo(modulo.grupo.id) }"></i>
                  {{ modulo.grupo.modulo_siglas }}
                </span>
              </div>
            </section>

            <section class="tarjeta">
              <header class="dashboard__tarjeta-cabecera">
                <div>
                  <h3>Próximas fechas</h3>
                  <p class="tenue">Lo que viene en todos los módulos</p>
                </div>
                <div class="dashboard__leyenda-modalidad" aria-label="Modalidad de los módulos">
                  <span>
                    <i
                      class="dashboard__punto-modalidad dashboard__punto-modalidad--presencial"
                    ></i>
                    Presencial
                  </span>
                  <span>
                    <i
                      class="dashboard__punto-modalidad dashboard__punto-modalidad--semipresencial"
                    ></i>
                    Semipresencial
                  </span>
                </div>
              </header>

              <p v-if="proximasFechas.length === 0" class="tenue">No hay fechas próximas.</p>
              <ul v-else class="dashboard__proximas-lista">
                <li v-for="item in proximasFechas" :key="`${item.grupoId}-${item.id}`">
                  <span class="dashboard__fecha" :class="`dashboard__fecha--${item.tipo}`">
                    {{ fechaCorta(item.fecha) }}
                  </span>
                  <span class="dashboard__contenido">
                    <small v-if="item.hora" class="tenue">{{ item.hora }} · </small>
                    {{ item.titulo }}
                    <span
                      v-if="item.modalidad"
                      class="dashboard__modulo-marca"
                      :class="`dashboard__modulo-marca--${item.modalidad}`"
                    >
                      <i
                        class="dashboard__punto-modalidad"
                        :class="`dashboard__punto-modalidad--${item.modalidad}`"
                      ></i>
                      {{ item.moduloSiglas }}
                    </span>
                    <span v-else class="chip">{{ item.moduloSiglas }}</span>
                  </span>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </template>
    </template>
  </section>
</template>

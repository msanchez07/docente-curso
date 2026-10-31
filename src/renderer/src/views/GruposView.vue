<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import MenuAcciones, { type AccionMenu } from '@renderer/components/MenuAcciones.vue'
import Modal from '@renderer/components/Modal.vue'
import {
  BLOQUES_HORARIO,
  CURSOS,
  DIAS_SEMANA,
  bloquesDesdeConteos,
  contarBloques,
  etiquetaModalidad,
  nombreGrupoClase,
  normalizarBloquesSemana,
  resumenDiasSemana,
  resumenTutoriasSemana,
  tutoriasDesdeBloques,
  siglasDesdeNombre
} from '@shared/grupos'
import { cursoAcademicoActual } from '@shared/curso-academico'
import { ESQUEMA_ALUMNADO } from '@shared/esquemas-importacion'
import { descargarJson } from '@renderer/utils/descargar-json'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import { useCursosAcademicosStore } from '@renderer/stores/cursos-academicos'
import type {
  BloqueSemana,
  BloquesSemana,
  DiaSemana,
  DiasSemana,
  GrupoClase,
  GrupoClaseEntrada,
  Modulo,
  TipoBloqueHorario,
  ResultadoImportacionClase,
  CicloCatalogo,
  ModuloCatalogo,
  NivelCatalogo
} from '@shared/tipos'

const gruposStore = useGruposClaseStore()
const cursosStore = useCursosAcademicosStore()

const grupos = computed(() =>
  gruposStore.grupos.filter((grupo) => grupo.curso_academico_id === cursosStore.activoId)
)
const catalogo = ref<CicloCatalogo[]>([])
const busquedaCiclo = ref('')
const filtroNivel = ref<'todos' | NivelCatalogo>('todos')
const filtroFamilia = ref('todas')
const busquedaModulo = ref('')
const cargando = ref(true)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const router = useRouter()
const route = useRoute()

const NIVELES: { valor: NivelCatalogo; etiqueta: string }[] = [
  { valor: 'GB', etiqueta: 'Grado Básico' },
  { valor: 'GM', etiqueta: 'Grado Medio' },
  { valor: 'GS', etiqueta: 'Grado Superior' }
]

const mostrarForm = ref(false)
const formularioRef = ref<HTMLElement | null>(null)
const editando = ref<number | null>(null)
const guardando = ref(false)
const errorFormulario = ref<string | null>(null)
const form = reactive<
  GrupoClaseEntrada & {
    dias_semana: DiasSemana
    bloques_semana: BloquesSemana
  }
>({
  ciclo_id: '',
  curso: '1',
  modalidad: 'presencial',
  modulo_codigo: '',
  dias_semana: {},
  bloques_semana: {}
})

type FilaHorario =
  { tipo: 'bloque'; inicio: string; fin: string } | { tipo: 'recreo'; texto: string }

const filasHorario = computed<FilaHorario[]>(() => {
  const filas: FilaHorario[] = []
  for (const bloque of BLOQUES_HORARIO) {
    if (bloque.inicio === '11:15') {
      filas.push({ tipo: 'recreo', texto: 'Recreo · 10:45–11:15' })
    }
    if (bloque.inicio === '18:20') {
      filas.push({ tipo: 'recreo', texto: 'Recreo · 18:00–18:20' })
    }
    filas.push({ tipo: 'bloque', inicio: bloque.inicio, fin: bloque.fin })
  }
  return filas
})

const cursoFormulario = computed(() =>
  editando.value === null
    ? (cursosStore.actual?.nombre ?? cursoAcademicoActual().nombre)
    : (gruposStore.grupo(editando.value)?.curso_academico_nombre ?? '—')
)

const grupoABorrar = ref<GrupoClase | null>(null)
const borrando = ref(false)

const moduloRaCe = ref<Modulo | null>(null)
const cargandoRaCe = ref(false)

const grupoImportar = ref<GrupoClase | null>(null)
const textoImportar = ref('')
const importando = ref(false)
const errorImportar = ref<string | null>(null)
const resultadoImportar = ref<ResultadoImportacionClase | null>(null)
const ficheroImportar = ref<HTMLInputElement | null>(null)

const totalCe = computed(
  () => moduloRaCe.value?.ra.reduce((total, ra) => total + ra.ce.length, 0) ?? 0
)

const familias = computed(() =>
  [...new Set(catalogo.value.map((ciclo) => ciclo.familia_profesional))].sort((a, b) =>
    a.localeCompare(b, 'es')
  )
)

const cicloSeleccionado = computed(
  () => catalogo.value.find((ciclo) => ciclo.id === form.ciclo_id) ?? null
)

const resultadosCiclos = computed(() => {
  const termino = normalizar(busquedaCiclo.value)
  return catalogo.value.filter((ciclo) => {
    if (filtroNivel.value !== 'todos' && ciclo.nivel !== filtroNivel.value) return false
    if (filtroFamilia.value !== 'todas' && ciclo.familia_profesional !== filtroFamilia.value) {
      return false
    }
    if (!termino) return true
    return normalizar(
      `${ciclo.denominacion} ${ciclo.familia_profesional} ${ciclo.abreviatura} ${ciclo.nivel}`
    ).includes(termino)
  })
})

const cursosDisponibles = computed(() => {
  if (!cicloSeleccionado.value) return CURSOS
  return CURSOS.filter((curso) =>
    cicloSeleccionado.value?.modulos.some((modulo) => modulo.curso === curso)
  )
})

/** Solo los módulos que se imparten en el curso elegido. */
const modulosDelCurso = computed(() =>
  (cicloSeleccionado.value?.modulos ?? []).filter((modulo) => modulo.curso === form.curso)
)

const modulosFiltrados = computed(() => {
  const termino = normalizar(busquedaModulo.value)
  if (!termino) return modulosDelCurso.value
  return modulosDelCurso.value.filter((modulo) =>
    normalizar(`${modulo.codigo} ${modulo.nombre}`).includes(termino)
  )
})

const totalHorasSemana = computed(() =>
  modulosDelCurso.value.reduce((total, modulo) => total + (modulo.horas_semanales ?? 0), 0)
)

const moduloSeleccionado = computed(
  () => modulosDelCurso.value.find((modulo) => modulo.codigo === form.modulo_codigo) ?? null
)

const nombrePreview = computed(() => {
  if (!form.ciclo_id || !moduloSeleccionado.value) return '—'
  return nombreGrupoClase(
    form.ciclo_id,
    form.curso,
    form.modalidad,
    siglasDesdeNombre(moduloSeleccionado.value.nombre),
    cicloSeleccionado.value?.abreviatura
  )
})

const moduloPreview = computed(() => moduloSeleccionado.value?.nombre ?? '')

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function nivelEtiqueta(nivel: NivelCatalogo): string {
  return NIVELES.find((item) => item.valor === nivel)?.etiqueta ?? nivel
}

function resumenCiclo(ciclo: CicloCatalogo): string {
  const primero = ciclo.modulos.filter((modulo) => modulo.curso === '1').length
  const segundo = ciclo.modulos.filter((modulo) => modulo.curso === '2').length
  return `${primero} mód. en 1º · ${segundo} en 2º`
}

function seleccionarCiclo(ciclo: CicloCatalogo): void {
  form.ciclo_id = ciclo.id
  const disponibles = CURSOS.filter((curso) =>
    ciclo.modulos.some((modulo) => modulo.curso === curso)
  )
  if (!disponibles.includes(form.curso)) form.curso = disponibles[0] ?? '1'
  form.modulo_codigo = ciclo.modulos.find((modulo) => modulo.curso === form.curso)?.codigo ?? ''
  busquedaModulo.value = ''
  errorFormulario.value = null
}

function cambiarCiclo(): void {
  form.ciclo_id = ''
  form.modulo_codigo = ''
  busquedaModulo.value = ''
  errorFormulario.value = null
}

function seleccionarModulo(modulo: ModuloCatalogo): void {
  form.modulo_codigo = modulo.codigo
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    const [listaCatalogo] = await Promise.all([
      window.api.catalogo.listar(),
      gruposStore.cargar(true),
      cursosStore.cargar(true)
    ])
    catalogo.value = listaCatalogo
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  await cargar()
  if (route.query.nuevo === '1') {
    await nuevo()
    await router.replace({ path: '/grupos' })
  }
})

async function nuevo(): Promise<void> {
  editando.value = null
  form.ciclo_id = ''
  form.curso = '1'
  form.modalidad = 'presencial'
  form.modulo_codigo = ''
  form.dias_semana = {}
  form.bloques_semana = {}
  busquedaCiclo.value = ''
  filtroNivel.value = 'todos'
  filtroFamilia.value = 'todas'
  busquedaModulo.value = ''
  errorFormulario.value = null
  mostrarForm.value = true
  void nextTick(() => formularioRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

async function editar(grupo: GrupoClase): Promise<void> {
  editando.value = grupo.id
  form.ciclo_id = grupo.ciclo_id
  form.curso = grupo.curso
  form.modalidad = grupo.modalidad
  form.modulo_codigo = grupo.modulo_codigo
  form.dias_semana = { ...grupo.dias_semana }
  form.bloques_semana =
    Object.keys(grupo.bloques_semana).length > 0
      ? { ...grupo.bloques_semana }
      : bloquesDesdeConteos(grupo.dias_semana)
  busquedaCiclo.value = ''
  busquedaModulo.value = ''
  errorFormulario.value = null
  if (!catalogo.value.some((ciclo) => ciclo.id === grupo.ciclo_id)) {
    errorFormulario.value =
      'Este grupo pertenece a un ciclo que no está en el catálogo de horarios. Se guardará con los datos actuales.'
  }
  mostrarForm.value = true
  void nextTick(() => formularioRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function alCambiarCurso(): void {
  busquedaModulo.value = ''
  form.modulo_codigo = modulosDelCurso.value[0]?.codigo ?? ''
}

const ORDEN_TIPOS: TipoBloqueHorario[] = ['sesion', 'colectiva', 'individual']

function tipoBloque(dia: DiaSemana, inicio: string): TipoBloqueHorario | null {
  return form.bloques_semana[dia]?.find((bloque) => bloque.inicio === inicio)?.tipo ?? null
}

function etiquetaTipoBloque(tipo: TipoBloqueHorario | null): string {
  if (tipo === 'sesion') return 'S'
  if (tipo === 'colectiva') return 'C'
  if (tipo === 'individual') return 'I'
  return ''
}

function alternarBloque(dia: DiaSemana, inicio: string): void {
  const actual = form.bloques_semana[dia] ?? []
  const indice = actual.findIndex((bloque) => bloque.inicio === inicio)
  const tipos: TipoBloqueHorario[] = form.modalidad === 'semipresencial' ? ORDEN_TIPOS : ['sesion']
  let siguiente: BloqueSemana[]
  if (indice === -1) {
    siguiente = [...actual, { inicio, tipo: 'sesion' }]
  } else {
    const posicion = tipos.indexOf(actual[indice].tipo)
    if (posicion === -1 || posicion >= tipos.length - 1) {
      siguiente = actual.filter((bloque) => bloque.inicio !== inicio)
    } else {
      siguiente = actual.map((bloque, posicionActual) =>
        posicionActual === indice ? { ...bloque, tipo: tipos[posicion + 1] } : bloque
      )
    }
  }
  if (siguiente.length > 0) {
    form.bloques_semana[dia] = siguiente
  } else {
    const copia = { ...form.bloques_semana }
    delete copia[dia]
    form.bloques_semana = copia
  }
  form.dias_semana = contarBloques(form.bloques_semana)
}

function vaciarCalendario(): void {
  form.bloques_semana = {}
  form.dias_semana = {}
}

async function guardar(): Promise<void> {
  errorFormulario.value = null
  guardando.value = true
  try {
    const bloques_semana = normalizarBloquesSemana(form.bloques_semana)
    const entrada = {
      ...form,
      bloques_semana,
      dias_semana: contarBloques(bloques_semana),
      tutorias_semana: tutoriasDesdeBloques(bloques_semana)
    }
    let guardado: GrupoClase | null = null
    if (editando.value === null) {
      guardado = await window.api.gruposClase.crear(entrada)
      mensaje.value = `Grupo «${guardado.nombre}» guardado.`
    } else {
      guardado = await window.api.gruposClase.actualizar(editando.value, entrada)
      mensaje.value = `Grupo «${guardado?.nombre ?? nombrePreview.value}» actualizado.`
    }
    mostrarForm.value = false
    await cargar()
    if (guardado) cursosStore.activar(guardado.curso_academico_id)
  } catch (e) {
    errorFormulario.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

function accionesGrupo(): AccionMenu[] {
  return [
    { id: 'programacion', etiqueta: 'Abrir programación de aula', icono: 'programacion' },
    { id: 'criterios', etiqueta: 'Criterios de calificación', icono: 'criterios' },
    { id: 'importar', etiqueta: 'Importar alumnado', icono: 'importar' },
    { id: 'rae', etiqueta: 'Consultar RA/CE', icono: 'rae' },
    { id: 'editar', etiqueta: 'Editar grupo', icono: 'editar' },
    { id: 'borrar', etiqueta: 'Borrar grupo', icono: 'borrar', peligro: true }
  ]
}

function ejecutarAccionGrupo(grupo: GrupoClase, accion: string): void {
  if (accion === 'programacion') {
    router.push({ name: 'programacion', params: { grupoId: grupo.id } })
  } else if (accion === 'criterios') {
    router.push({ name: 'criterios', params: { grupoId: grupo.id } })
  } else if (accion === 'importar') {
    abrirImportar(grupo)
  } else if (accion === 'rae') {
    void abrirRaCe(grupo)
  } else if (accion === 'editar') {
    void editar(grupo)
  } else if (accion === 'borrar') {
    pedirBorrado(grupo)
  }
}

function pedirBorrado(grupo: GrupoClase): void {
  grupoABorrar.value = grupo
}

async function confirmarBorrado(): Promise<void> {
  if (!grupoABorrar.value) return
  const nombre = grupoABorrar.value.nombre
  borrando.value = true
  error.value = null
  try {
    await window.api.gruposClase.borrar(grupoABorrar.value.id)
    grupoABorrar.value = null
    mensaje.value = `Grupo «${nombre}» borrado.`
    await cargar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    borrando.value = false
  }
}

async function abrirRaCe(grupo: GrupoClase): Promise<void> {
  error.value = null
  cargandoRaCe.value = true
  try {
    const modulo = await window.api.boe.obtenerModulo(grupo.modulo_codigo)
    if (!modulo) {
      error.value = `No se han encontrado los RA/CE del módulo ${grupo.modulo_codigo}.`
      return
    }
    moduloRaCe.value = modulo
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargandoRaCe.value = false
  }
}

function abrirImportar(grupo: GrupoClase): void {
  grupoImportar.value = grupo
  textoImportar.value = ''
  errorImportar.value = null
  resultadoImportar.value = null
}

function exportarEsquema(): void {
  descargarJson('esquema-alumnado.json', ESQUEMA_ALUMNADO)
}

async function importarTexto(texto: string): Promise<void> {
  if (!grupoImportar.value || !texto.trim()) return
  importando.value = true
  errorImportar.value = null
  resultadoImportar.value = null
  const grupo = grupoImportar.value
  try {
    const resultado = await window.api.matriculasClase.importar(grupo.id, texto)
    resultadoImportar.value = resultado
    if (resultado.errores.length > 0) {
      errorImportar.value = resultado.errores.slice(0, 6).join(' · ')
    }
    if (resultado.creados + resultado.existentes > 0) {
      mensaje.value = `${resultado.creados} alumnos nuevos y ${resultado.existentes} ya existentes matriculados en «${grupo.nombre}».`
    }
    await cargar()
  } catch (e) {
    errorImportar.value = (e as Error).message ?? String(e)
  } finally {
    importando.value = false
  }
}

async function importarPegado(): Promise<void> {
  await importarTexto(textoImportar.value)
}

async function alElegirFichero(evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement
  const fichero = entrada.files?.[0]
  if (!fichero) return
  try {
    await importarTexto(await fichero.text())
  } finally {
    entrada.value = ''
  }
}
</script>

<template>
  <section class="vista vista--ancha">
    <header class="vista__cabecera">
      <h2>Grupos</h2>
      <p class="tenue">
        Curso académico
        <strong>{{ cursosStore.activo?.nombre ?? '—' }}</strong
        >. Las clases de FP de DAW que impartes; cada grupo se identifica por ciclo, módulo, nivel y
        modalidad.
      </p>
    </header>

    <div class="barra">
      <button
        class="boton boton--principal"
        type="button"
        :disabled="cargando || catalogo.length === 0"
        @click="nuevo"
      >
        Nuevo grupo
      </button>
      <RouterLink to="/plantillas" class="boton">Plantillas</RouterLink>
      <span class="barra__espacio"></span>
      <span class="tenue">
        {{ grupos.length }} {{ grupos.length === 1 ? 'grupo' : 'grupos' }}
      </span>
    </div>

    <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>
    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <section v-if="mostrarForm" ref="formularioRef" class="tarjeta form-inline">
      <header class="entrega-form__seccion-cabecera">
        <div>
          <h3>{{ editando === null ? 'Nuevo grupo' : 'Editar grupo' }}</h3>
          <p class="tenue">Curso académico, ciclo, nivel y modalidad del grupo.</p>
        </div>
        <div class="form-inline__acciones">
          <button class="boton" type="button" @click="mostrarForm = false">Cancelar</button>
          <button
            class="boton boton--principal"
            type="button"
            :disabled="guardando || !form.ciclo_id || !form.modulo_codigo"
            @click="guardar"
          >
            {{ guardando ? 'Guardando…' : 'Guardar grupo' }}
          </button>
        </div>
      </header>

      <p v-if="errorFormulario" class="aviso aviso--error" role="alert">
        {{ errorFormulario }}
      </p>

      <div class="formulario">
        <div class="campo campo--ancho">
          <span class="campo__etiqueta">Ciclo *</span>
          <p class="tenue">
            Secuenciación y horarios oficiales 2026/2027. Busca por nombre, familia o nivel; los
            módulos se filtran por curso.
          </p>

          <div v-if="!cicloSeleccionado" class="selector-catalogo">
            <div class="selector-catalogo__filtros">
              <input
                v-model="busquedaCiclo"
                type="search"
                placeholder="Buscar ciclo, siglas o familia…"
                aria-label="Buscar ciclo"
              />
              <select v-model="filtroNivel" aria-label="Filtrar por nivel">
                <option value="todos">Todos los niveles</option>
                <option v-for="nivel in NIVELES" :key="nivel.valor" :value="nivel.valor">
                  {{ nivel.etiqueta }}
                </option>
              </select>
              <select v-model="filtroFamilia" aria-label="Filtrar por familia profesional">
                <option value="todas">Todas las familias</option>
                <option v-for="familia in familias" :key="familia" :value="familia">
                  {{ familia }}
                </option>
              </select>
            </div>
            <p class="tenue selector-catalogo__resumen">
              {{ resultadosCiclos.length }}
              {{ resultadosCiclos.length === 1 ? 'ciclo' : 'ciclos' }} · elige uno para ver sus
              módulos
            </p>
            <div class="selector-catalogo__lista" role="group" aria-label="Ciclos disponibles">
              <button
                v-for="ciclo in resultadosCiclos"
                :key="ciclo.id"
                type="button"
                class="ciclo-opcion"
                @click="seleccionarCiclo(ciclo)"
              >
                <span class="ciclo-opcion__nombre">{{ ciclo.denominacion }}</span>
                <span class="ciclo-opcion__meta">
                  {{ nivelEtiqueta(ciclo.nivel) }} · {{ ciclo.familia_profesional }}
                </span>
                <span class="ciclo-opcion__horas">{{ resumenCiclo(ciclo) }}</span>
              </button>
              <p v-if="resultadosCiclos.length === 0" class="vacio">
                No hay ciclos con esos filtros.
              </p>
            </div>
          </div>

          <div v-else class="ciclo-elegido">
            <div class="ciclo-elegido__datos">
              <strong>{{ cicloSeleccionado.denominacion }}</strong>
              <span class="tenue">
                {{ nivelEtiqueta(cicloSeleccionado.nivel) }} ·
                {{ cicloSeleccionado.familia_profesional }} · {{ cicloSeleccionado.abreviatura }}
              </span>
            </div>
            <button class="boton boton--sutil" type="button" @click="cambiarCiclo">
              Cambiar ciclo
            </button>
          </div>
        </div>

        <div class="campo">
          <label for="grupo-curso">Nivel *</label>
          <select id="grupo-curso" v-model="form.curso" @change="alCambiarCurso">
            <option
              v-for="curso in CURSOS"
              :key="curso"
              :value="curso"
              :disabled="!cursosDisponibles.includes(curso)"
            >
              {{ curso }}º
            </option>
          </select>
        </div>
        <div class="campo">
          <label for="grupo-modalidad">Modalidad *</label>
          <select id="grupo-modalidad" v-model="form.modalidad">
            <option value="presencial">Presencial</option>
            <option value="semipresencial">Semipresencial</option>
          </select>
        </div>
        <div class="campo campo--ancho">
          <span class="campo__etiqueta">Curso académico</span>
          <p class="previsualizacion">{{ cursoFormulario }}</p>
          <p class="tenue">
            {{
              editando === null
                ? 'Se calcula automáticamente al crear el grupo (septiembre–julio).'
                : 'El grupo conserva el curso académico con el que se creó.'
            }}
          </p>
        </div>

        <div v-if="cicloSeleccionado" class="campo campo--ancho">
          <span class="campo__etiqueta">Módulo *</span>
          <div class="modulo-cabecera">
            <input
              v-model="busquedaModulo"
              type="search"
              placeholder="Buscar módulo por código o nombre…"
              aria-label="Buscar módulo"
            />
            <span class="chip">
              {{ modulosDelCurso.length }} módulos · {{ totalHorasSemana }} h/semana en
              {{ form.curso }}º
            </span>
          </div>
          <div class="lista-modulos" role="group" aria-label="Módulos del ciclo">
            <button
              v-for="modulo in modulosFiltrados"
              :key="modulo.codigo"
              type="button"
              class="modulo-opcion"
              :class="{ 'modulo-opcion--activo': form.modulo_codigo === modulo.codigo }"
              :aria-pressed="form.modulo_codigo === modulo.codigo"
              @click="seleccionarModulo(modulo)"
            >
              <span class="modulo-opcion__codigo">{{ modulo.codigo }}</span>
              <span class="modulo-opcion__nombre">{{ modulo.nombre }}</span>
              <span class="modulo-opcion__horas">
                {{ modulo.horas_semanales ?? '—' }} h/sem · {{ modulo.horas_anuales ?? '—' }}
                h/año
              </span>
            </button>
            <p v-if="modulosFiltrados.length === 0" class="vacio">
              No hay módulos con ese filtro en {{ form.curso }}º.
            </p>
          </div>
        </div>
        <div v-else class="campo campo--ancho">
          <span class="campo__etiqueta">Módulo *</span>
          <p class="tenue">Elige primero un ciclo para cargar sus módulos oficiales.</p>
        </div>

        <div class="campo campo--ancho">
          <span class="campo__etiqueta">Calendario semanal · bloques de 55 minutos</span>
          <p class="tenue">
            Haz clic en un bloque para añadirlo o quitarlo. Mañana de 08:00 a 14:00 con recreo de
            10:45 a 11:15; tarde de 14:40 a 21:05 con recreo de 18:00 a 18:20.
          </p>
          <div class="horario-semanal-scroll">
            <div class="horario-semanal">
              <div class="horario-semanal__hora horario-semanal__cabecera">Hora</div>
              <div
                v-for="dia in DIAS_SEMANA"
                :key="`cabecera-${dia.valor}`"
                class="horario-semanal__dia horario-semanal__cabecera"
              >
                {{ dia.corto }}
              </div>

              <template v-for="(fila, indice) in filasHorario" :key="`fila-${indice}`">
                <div v-if="fila.tipo === 'recreo'" class="horario-semanal__recreo">
                  {{ fila.texto }}
                </div>
                <template v-else>
                  <div class="horario-semanal__hora">{{ fila.inicio }}–{{ fila.fin }}</div>
                  <button
                    v-for="dia in DIAS_SEMANA"
                    :key="`${fila.inicio}-${dia.valor}`"
                    class="horario-semanal__celda"
                    :class="{
                      'horario-semanal__celda--sesion':
                        tipoBloque(dia.valor, fila.inicio) === 'sesion',
                      'horario-semanal__celda--colectiva':
                        tipoBloque(dia.valor, fila.inicio) === 'colectiva',
                      'horario-semanal__celda--individual':
                        tipoBloque(dia.valor, fila.inicio) === 'individual'
                    }"
                    type="button"
                    :aria-pressed="tipoBloque(dia.valor, fila.inicio) !== null"
                    :aria-label="`${dia.etiqueta}, bloque de ${fila.inicio} a ${fila.fin}: ${
                      tipoBloque(dia.valor, fila.inicio) === 'sesion'
                        ? 'sesión'
                        : tipoBloque(dia.valor, fila.inicio) === 'colectiva'
                          ? 'tutoría colectiva'
                          : tipoBloque(dia.valor, fila.inicio) === 'individual'
                            ? 'tutoría individual'
                            : 'vacío'
                    }`"
                    @click="alternarBloque(dia.valor, fila.inicio)"
                  >
                    <span aria-hidden="true">
                      {{ etiquetaTipoBloque(tipoBloque(dia.valor, fila.inicio)) }}
                    </span>
                  </button>
                </template>
              </template>
            </div>
          </div>
          <div class="horario-semanal__leyenda">
            <span class="horario-semanal__leyenda-item">
              <i class="horario-semanal__muestra horario-semanal__muestra--sesion"></i> Sesión
            </span>
            <template v-if="form.modalidad === 'semipresencial'">
              <span class="horario-semanal__leyenda-item">
                <i class="horario-semanal__muestra horario-semanal__muestra--colectiva"></i> Tutoría
                colectiva
              </span>
              <span class="horario-semanal__leyenda-item">
                <i class="horario-semanal__muestra horario-semanal__muestra--individual"></i>
                Tutoría individual
              </span>
            </template>
            <span class="tenue">Haz clic para cambiar el tipo o vaciar el bloque.</span>
          </div>
          <div class="horario-semanal__pie">
            <span class="tenue">
              {{ resumenDiasSemana(form.dias_semana) || 'Sin sesiones.' }}
              <template v-if="resumenTutoriasSemana(tutoriasDesdeBloques(form.bloques_semana))">
                · {{ resumenTutoriasSemana(tutoriasDesdeBloques(form.bloques_semana)) }}
              </template>
            </span>
            <button
              v-if="Object.keys(form.bloques_semana).length > 0"
              class="boton boton--sutil"
              type="button"
              @click="vaciarCalendario"
            >
              Vaciar calendario
            </button>
          </div>
        </div>
        <div class="campo campo--ancho">
          <span class="campo__etiqueta">Se guardará como</span>
          <p class="previsualizacion">{{ nombrePreview }}</p>
          <p v-if="moduloPreview" class="tenue">{{ moduloPreview }}</p>
        </div>
      </div>
    </section>

    <div v-if="cargando" class="vacio">Cargando grupos…</div>
    <div v-else-if="catalogo.length === 0" class="vacio">
      No hay catálogo de horarios cargado. Revisa los recursos de secuenciación.
    </div>
    <div v-else-if="grupos.length === 0" class="vacio">
      Todavía no hay grupos en {{ cursosStore.activo?.nombre ?? 'este curso' }}. Crea el primero:
      por ejemplo, «1º DAW · LMSGI · Presencial».
    </div>

    <div v-else class="tarjeta tarjeta--tabla">
      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Módulo</th>
              <th>Curso académico</th>
              <th>Ciclo · nivel</th>
              <th>Modalidad</th>
              <th class="num">Alumnos</th>
              <th class="acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="grupo in grupos" :key="grupo.id">
              <td>
                <RouterLink
                  :to="{ name: 'grupo', params: { id: grupo.id } }"
                  class="grupo__nombre grupo__enlace"
                >
                  {{ grupo.nombre }}
                </RouterLink>
                <span
                  class="grupo__estado"
                  :class="grupo.criterios ? 'grupo__estado--ok' : 'grupo__estado--falta'"
                >
                  {{ grupo.criterios ? 'Criterios definidos' : 'Sin criterios' }}
                </span>
              </td>
              <td>
                <span
                  class="codigo con-tooltip"
                  :data-tooltip="grupo.modulo_nombre"
                  :aria-label="`${grupo.modulo_siglas}: ${grupo.modulo_nombre}`"
                  tabindex="0"
                >
                  {{ grupo.modulo_siglas }}
                </span>
              </td>
              <td>{{ grupo.curso_academico_nombre }}</td>
              <td>{{ grupo.ciclo_id.toUpperCase() }} · {{ grupo.curso }}º</td>
              <td>
                {{ etiquetaModalidad(grupo.modalidad) }}
                <small
                  v-if="
                    grupo.modalidad === 'semipresencial' &&
                    resumenTutoriasSemana(grupo.tutorias_semana)
                  "
                  class="grupo__tutorias-resumen"
                >
                  {{ resumenTutoriasSemana(grupo.tutorias_semana) }}
                </small>
              </td>
              <td class="num">{{ grupo.alumnos }}</td>
              <td class="acciones">
                <MenuAcciones
                  :acciones="accionesGrupo()"
                  @accion="ejecutarAccionGrupo(grupo, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal
      v-if="grupoImportar"
      :titulo="`Importar alumnos · ${grupoImportar.nombre}`"
      @cerrar="grupoImportar = null"
    >
      <p class="tenue">
        Acepta JSON o CSV. Las columnas se reconocen por su nombre —
        <span class="monospace">nombre</span>, <span class="monospace">apellidos</span>,
        <span class="monospace">dni</span> y <span class="monospace">correo</span>—. Si el DNI ya
        existe, no se duplica: se matricula al alumno que ya está.
      </p>
      <div class="barra barra--separada">
        <button
          class="boton"
          type="button"
          :disabled="importando"
          @click="ficheroImportar?.click()"
        >
          Elegir fichero…
        </button>
        <button class="boton" type="button" @click="exportarEsquema">Descargar esquema</button>
        <input
          ref="ficheroImportar"
          class="visualmente-oculto"
          type="file"
          accept=".json,.csv,.txt"
          @change="alElegirFichero"
        />
        <span class="tenue">o pega el contenido abajo</span>
      </div>
      <div class="campo campo--ancho">
        <label for="importar-texto">Contenido</label>
        <textarea
          id="importar-texto"
          v-model="textoImportar"
          rows="8"
          class="monospace"
          placeholder="nombre,apellidos,dni,correo"
        ></textarea>
      </div>
      <p v-if="errorImportar" class="aviso aviso--error" role="alert">{{ errorImportar }}</p>
      <p v-if="resultadoImportar" class="aviso aviso--ok" role="status">
        {{ resultadoImportar.creados }} alumnos nuevos · {{ resultadoImportar.existentes }} ya
        existentes.
      </p>
      <template #pie>
        <button class="boton" type="button" @click="grupoImportar = null">Cerrar</button>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="importando || !textoImportar.trim()"
          @click="importarPegado"
        >
          {{ importando ? 'Importando…' : 'Importar lo pegado' }}
        </button>
      </template>
    </Modal>

    <Modal
      v-if="moduloRaCe"
      ancho="ancho"
      :titulo="`RA y CE · ${moduloRaCe.siglas ?? moduloRaCe.codigo}`"
      @cerrar="moduloRaCe = null"
    >
      <p class="tenue modal__subtitulo">
        {{ moduloRaCe.nombre }} · {{ moduloRaCe.ra.length }} RA · {{ totalCe }} CE
      </p>
      <div v-for="ra in moduloRaCe.ra" :key="ra.codigo" class="ra">
        <details :open="ra.numero === 1">
          <summary>
            <strong>{{ ra.codigo }}.</strong> {{ ra.descripcion }}
          </summary>
          <ol class="ce">
            <li v-for="ce in ra.ce" :key="ce.codigo">
              <span class="codigo-ce">{{ ce.codigo }})</span> {{ ce.descripcion }}
            </li>
          </ol>
        </details>
      </div>
    </Modal>

    <Confirmacion
      v-if="grupoABorrar"
      titulo="¿Borrar el grupo?"
      etiqueta-confirmar="Sí, borrar"
      peligro
      :ocupado="borrando"
      @cancelar="grupoABorrar = null"
      @confirmar="confirmarBorrado"
    >
      <p>
        Se va a borrar <strong>{{ grupoABorrar.nombre }}</strong
        >.
      </p>
      <p class="tenue">
        Todavía no tiene alumnado ni notas asociadas. Esta acción no se puede deshacer.
      </p>
    </Confirmacion>
  </section>
</template>

<style scoped>
.selector-catalogo {
  border: 1px solid var(--borde);
  border-radius: 12px;
  padding: 12px;
  background: #fbfcfd;
}

.selector-catalogo__filtros {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 180px 220px;
  gap: 8px;
}

.selector-catalogo__resumen {
  margin: 8px 0 6px;
}

.selector-catalogo__lista {
  max-height: 310px;
  overflow: auto;
  border: 1px solid var(--borde);
  border-radius: 10px;
  background: #fff;
}

.ciclo-opcion {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 12px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid var(--borde);
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.ciclo-opcion:last-child {
  border-bottom: 0;
}

.ciclo-opcion:hover,
.ciclo-opcion:focus-visible {
  background: var(--acento-suave);
}

.ciclo-opcion__nombre {
  font-size: 13.5px;
  font-weight: 600;
}

.ciclo-opcion__meta {
  color: var(--tenue);
  font-size: 12px;
}

.ciclo-opcion__horas {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  color: var(--tenue);
  font-size: 12px;
  white-space: nowrap;
}

.ciclo-elegido {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--borde);
  border-radius: 10px;
  background: #f8fafc;
}

.ciclo-elegido__datos {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.modulo-cabecera {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.modulo-cabecera input {
  flex: 1;
  min-width: 220px;
}

.lista-modulos {
  display: grid;
  gap: 5px;
  max-height: 300px;
  overflow: auto;
  padding: 5px;
  border: 1px solid var(--borde);
  border-radius: 10px;
  background: #fbfcfd;
}

.modulo-opcion {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.modulo-opcion:hover {
  border-color: var(--borde-fuerte);
}

.modulo-opcion--activo {
  border-color: var(--acento);
  background: var(--acento-suave);
}

.modulo-opcion__codigo {
  color: var(--tenue);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.modulo-opcion__nombre {
  font-size: 13.5px;
  font-weight: 500;
}

.modulo-opcion__horas {
  color: var(--tenue);
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 820px) {
  .selector-catalogo__filtros {
    grid-template-columns: 1fr;
  }

  .ciclo-opcion,
  .modulo-opcion {
    grid-template-columns: 1fr;
  }

  .ciclo-opcion__horas {
    grid-column: 1;
    grid-row: auto;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import SelectButton from '@renderer/components/SelectButton.vue'
import UnidadesProgramacion from '@renderer/components/UnidadesProgramacion.vue'
import CalendarioEscolarPanel from '@renderer/components/CalendarioEscolarPanel.vue'
import NavegacionMes from '@renderer/components/NavegacionMes.vue'
import MenuAcciones, { type AccionMenu } from '@renderer/components/MenuAcciones.vue'
import { notificar } from '@renderer/composables/notificaciones'
import { diasProgramacionDemo } from '@shared/demo-programacion'
import { ESQUEMA_PROGRAMACION } from '@shared/esquemas-importacion'
import { parsearDiasProgramacion } from '@shared/importar-programacion'
import { descargarJson } from '@renderer/utils/descargar-json'
import type { GrupoClase, ProgramacionAula, UnidadProgramacion } from '@shared/tipos'

const props = defineProps<{ grupo: GrupoClase }>()

interface FormDia {
  fecha: string
  hora: string
  unidad_id: number | null
  contenido: string
  desviacion: string
  observaciones: string
}

const filas = ref<ProgramacionAula[]>([])
const cargando = ref(true)
const guardando = ref(false)
const exportandoPdf = ref(false)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const original = ref('')
const verTodo = ref(false)
const modo = ref('tarjetas')
const opcionesModo = [
  { value: 'tarjetas', label: 'Tarjetas' },
  { value: 'tabla', label: 'Tabla' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'unidades', label: 'Unidades' },
  { value: 'calendario-escolar', label: 'Calendario escolar' }
]
const opcionesVista = [
  { value: 'quincena', label: 'Quincena' },
  { value: 'todo', label: 'Ver todo' }
]
const vista = computed({
  get: () => (verTodo.value ? 'todo' : 'quincena'),
  set: (valor: string) => {
    verTodo.value = valor === 'todo'
  }
})
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const mesCalendario = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const editando = ref<ProgramacionAula | null>(null)
const filaABorrar = ref<ProgramacionAula | null>(null)
const borrando = ref(false)

const mostrarImportar = ref(false)
const unidades = ref<UnidadProgramacion[]>([])
const textoImportar = ref('')
const ficheroImportar = ref<HTMLInputElement | null>(null)
const errorImportar = ref<string | null>(null)

const form = reactive<FormDia>({
  fecha: '',
  hora: '',
  unidad_id: null,
  contenido: '',
  desviacion: '',
  observaciones: ''
})

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
const inicioQuincena = hoy
const limite = isoLocal(sumarDias(new Date(), 15))

function fechaSugerida(): string {
  const ocupadas = new Set(filas.value.map((fila) => fila.fecha))
  let fecha = new Date(`${hoy}T00:00:00`)
  while (ocupadas.has(isoLocal(fecha))) fecha = sumarDias(fecha, 1)
  return isoLocal(fecha)
}

function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function unidadDe(fila: ProgramacionAula): UnidadProgramacion | null {
  return unidades.value.find((unidad) => unidad.id === fila.unidad_id) ?? null
}

function partesFecha(iso: string): { dia: string; mes: string; semana: string } {
  if (!iso) return { dia: '—', mes: '—', semana: '' }
  const fecha = new Date(`${iso}T00:00:00`)
  return {
    dia: String(fecha.getDate()).padStart(2, '0'),
    mes: fecha.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
    semana: fecha.toLocaleDateString('es-ES', { weekday: 'long' })
  }
}

function serializar(lista: ProgramacionAula[]): string {
  return JSON.stringify(
    lista.map((fila) => ({
      id: fila.id,
      fecha: fila.fecha,
      hora: fila.hora,
      orden: fila.orden,
      unidad_id: fila.unidad_id,
      contenido: fila.contenido,
      desviacion: fila.desviacion,
      observaciones: fila.observaciones
    }))
  )
}

const hayCambios = computed(() => serializar(filas.value) !== original.value)

const filasVisibles = computed(() =>
  verTodo.value
    ? filas.value
    : filas.value.filter((fila) => fila.fecha >= inicioQuincena && fila.fecha <= limite)
)

const sinContenido = computed(() => filas.value.filter((fila) => !fila.contenido.trim()).length)

function desviacionReal(fila: ProgramacionAula): string {
  const texto = fila.desviacion.trim()
  return /^sin desviaci[oó]n$/i.test(texto) ? '' : texto
}

const conDesviacion = computed(() => filas.value.filter((fila) => desviacionReal(fila)).length)

const puedeGuardarDia = computed(
  () => Boolean(form.fecha) && hayCambiosDia.value && !guardando.value
)

const hayCambiosDia = computed(() => {
  if (!editando.value) {
    return Boolean(
      form.fecha && (form.contenido.trim() || form.desviacion.trim() || form.observaciones.trim())
    )
  }
  return (
    editando.value.fecha !== form.fecha ||
    editando.value.contenido !== form.contenido ||
    editando.value.desviacion !== form.desviacion ||
    editando.value.observaciones !== form.observaciones
  )
})

async function cargarUnidades(): Promise<void> {
  try {
    unidades.value = await window.api.unidadesProgramacion.listar(props.grupo.id)
  } catch {
    unidades.value = []
  }
}

onMounted(async () => {
  try {
    filas.value = await window.api.programacion.listar(props.grupo.id)
    original.value = serializar(filas.value)
    form.fecha = fechaSugerida()
    await cargarUnidades()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
})

function nuevaFila(fecha = fechaSugerida()): void {
  editando.value = null
  form.fecha = fecha
  form.hora = ''
  form.unidad_id = null
  form.contenido = ''
  form.desviacion = ''
  form.observaciones = ''
  error.value = null
  mensaje.value = null
}

function editarFila(fila: ProgramacionAula): void {
  editando.value = fila
  form.fecha = fila.fecha
  form.hora = fila.hora ?? ''
  form.unidad_id = fila.unidad_id
  form.contenido = fila.contenido
  form.desviacion = fila.desviacion
  form.observaciones = fila.observaciones
  error.value = null
  mensaje.value = null
}

function cancelarEdicion(): void {
  nuevaFila()
}

const mesTexto = computed(() => {
  const texto = mesCalendario.value.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

function ordenarFilas(a: ProgramacionAula, b: ProgramacionAula): number {
  return (
    a.fecha.localeCompare(b.fecha) ||
    a.orden - b.orden ||
    (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
    a.id - b.id
  )
}

const celdasCalendario = computed(() => {
  const anio = mesCalendario.value.getFullYear()
  const mes = mesCalendario.value.getMonth()
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
      filas: filas.value
        .filter((fila) => fila.fecha === iso)
        .slice()
        .sort(ordenarFilas)
    }
  })
})

function accionesSecundarias(): AccionMenu[] {
  return [
    { id: 'ejemplo', etiqueta: 'Cargar ejemplo', icono: 'programacion' },
    { id: 'importar', etiqueta: 'Importar programación', icono: 'importar' },
    { id: 'esquema', etiqueta: 'Descargar esquema', icono: 'descargar' }
  ]
}

function ejecutarAccionSecundaria(accion: string): void {
  if (accion === 'ejemplo') cargarEjemplo()
  else if (accion === 'importar') abrirImportar()
  else if (accion === 'esquema') exportarEsquema()
}

function cambiarMes(delta: number): void {
  mesCalendario.value = new Date(
    mesCalendario.value.getFullYear(),
    mesCalendario.value.getMonth() + delta,
    1
  )
}

function irMesActual(): void {
  mesCalendario.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
}

function seleccionarDia(fecha: string): void {
  nuevaFila(fecha)
}

function guardarDia(): void {
  error.value = null
  mensaje.value = null
  if (!form.fecha) {
    error.value = 'La fecha es obligatoria.'
    return
  }
  if (!form.contenido.trim() && !form.desviacion.trim() && !form.observaciones.trim()) {
    error.value = 'Añade contenido, una desviación o una observación.'
    return
  }
  const eraEdicion = Boolean(editando.value)
  const fechaGuardada = form.fecha

  if (editando.value) {
    editando.value.fecha = form.fecha
    editando.value.hora = form.hora || null
    editando.value.unidad_id = form.unidad_id
    editando.value.contenido = form.contenido
    editando.value.desviacion = form.desviacion
    editando.value.observaciones = form.observaciones
  } else {
    filas.value.push({
      id: 0,
      grupo_clase_id: props.grupo.id,
      unidad_id: form.unidad_id,
      fecha: form.fecha,
      hora: form.hora || null,
      orden: filas.value.filter((fila) => fila.fecha === form.fecha).length,
      contenido: form.contenido,
      desviacion: form.desviacion,
      observaciones: form.observaciones,
      creado_en: '',
      actualizado_en: ''
    })
  }

  filas.value.sort(ordenarFilas)
  nuevaFila()
  mensaje.value = eraEdicion
    ? `Día ${fechaCorta(fechaGuardada)} actualizado en la programación.`
    : `Día ${fechaCorta(fechaGuardada)} añadido. Guarda la programación para conservarlo.`
}

function nuevaFilaTabla(): void {
  const fecha = fechaSugerida()
  filas.value.push({
    id: 0,
    grupo_clase_id: props.grupo.id,
    unidad_id: null,
    fecha,
    hora: null,
    orden: 0,
    contenido: '',
    desviacion: '',
    observaciones: '',
    creado_en: '',
    actualizado_en: ''
  })
  verTodo.value = true
  error.value = null
  mensaje.value = `Fila del ${fechaCorta(fecha)} añadida. Escribe el contenido y guarda.`
}

function quitar(): void {
  if (!filaABorrar.value) return
  const indice = filas.value.indexOf(filaABorrar.value)
  if (indice >= 0) filas.value.splice(indice, 1)
  if (editando.value === filaABorrar.value) nuevaFila()
  filaABorrar.value = null
  borrando.value = false
  mensaje.value = null
}

function abrirImportar(): void {
  mostrarImportar.value = true
  textoImportar.value = ''
  errorImportar.value = null
  mensaje.value = null
}

function exportarEsquema(): void {
  descargarJson('esquema-programacion.json', ESQUEMA_PROGRAMACION)
}

function cargarEjemplo(): void {
  const porFecha = new Map(filas.value.map((fila) => [fila.fecha, fila]))
  let anadidos = 0
  let rellenados = 0

  for (const dia of diasProgramacionDemo()) {
    const existente = porFecha.get(dia.fecha)
    if (existente) {
      if (!existente.contenido && !existente.desviacion && !existente.observaciones) {
        existente.contenido = dia.contenido
        existente.desviacion = dia.desviacion
        existente.observaciones = dia.observaciones
        rellenados++
      }
      continue
    }
    filas.value.push({
      id: 0,
      grupo_clase_id: props.grupo.id,
      unidad_id: null,
      hora: null,
      orden: 0,
      ...dia,
      creado_en: '',
      actualizado_en: ''
    })
    anadidos++
  }

  filas.value.sort(ordenarFilas)
  mensaje.value =
    anadidos + rellenados > 0
      ? `${anadidos} días añadidos y ${rellenados} rellenados con datos de ejemplo. Guarda para conservarlos.`
      : 'Los datos de ejemplo ya estaban cargados.'
  error.value = null
  mostrarImportar.value = false
}

async function importarTexto(texto: string): Promise<void> {
  const { dias, errores } = parsearDiasProgramacion(texto)
  if (dias.length === 0) {
    errorImportar.value = errores.join(' · ') || 'No se ha encontrado ningún día.'
    return
  }

  const existentes = new Set(filas.value.map((fila) => fila.fecha))
  let anadidos = 0
  for (const dia of dias) {
    if (existentes.has(dia.fecha)) continue
    filas.value.push({
      id: 0,
      grupo_clase_id: props.grupo.id,
      unidad_id: null,
      hora: null,
      orden: 0,
      fecha: dia.fecha,
      contenido: dia.contenido,
      desviacion: dia.desviacion,
      observaciones: dia.observaciones,
      creado_en: '',
      actualizado_en: ''
    })
    existentes.add(dia.fecha)
    anadidos++
  }

  filas.value.sort(ordenarFilas)
  const yaEstaban = dias.length - anadidos
  mensaje.value =
    yaEstaban > 0
      ? `${anadidos} días añadidos; ${yaEstaban} ya estaban y no se han tocado.`
      : `${anadidos} días añadidos. Revisa el contenido y guarda.`
  errorImportar.value = null
  error.value = errores.length > 0 ? errores.slice(0, 6).join(' · ') : null
  mostrarImportar.value = false
  if (!verTodo.value && filasVisibles.value.length === 0) verTodo.value = true
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
  } catch (e) {
    errorImportar.value = (e as Error).message ?? String(e)
  } finally {
    entrada.value = ''
  }
}

async function guardar(): Promise<boolean> {
  if (!hayCambios.value) return true
  for (const fila of filas.value) {
    if (!fila.fecha) {
      error.value = 'Hay una fila sin fecha. Corrígela antes de guardar.'
      return false
    }
  }
  guardando.value = true
  error.value = null
  mensaje.value = null
  try {
    filas.value = await window.api.programacion.guardar(props.grupo.id, filas.value)
    original.value = serializar(filas.value)
    mensaje.value = 'Programación guardada.'
    notificar(mensaje.value)
    return true
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
    return false
  } finally {
    guardando.value = false
  }
}

async function exportarPdf(): Promise<void> {
  error.value = null
  mensaje.value = null
  if (hayCambios.value && !(await guardar())) return
  exportandoPdf.value = true
  try {
    const resultado = await window.api.programacion.exportarPdf(props.grupo.id)
    if (resultado.ok) {
      mensaje.value = resultado.ruta
        ? `Programación exportada: ${resultado.ruta}`
        : (resultado.mensaje ?? 'Programación exportada.')
      notificar(mensaje.value)
    } else if (resultado.mensaje && resultado.mensaje !== 'Guardado cancelado') {
      error.value = resultado.mensaje
    }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    exportandoPdf.value = false
  }
}
</script>

<template>
  <div class="programacion">
    <div v-if="cargando" class="vacio">Cargando programación…</div>

    <template v-else>
      <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

      <div class="programacion__barra">
        <template v-if="modo !== 'calendario-escolar'">
          <template v-if="modo !== 'calendario'">
            <SelectButton
              v-model="vista"
              :opciones="opcionesVista"
              aria-label="Vista de la programación"
              compacto
            />
            <span class="tenue programacion__rango">
              <template v-if="verTodo">Mostrando todos los días.</template>
              <template v-else>
                Del {{ fechaCorta(inicioQuincena) }} al {{ fechaCorta(limite) }}
              </template>
            </span>
          </template>

          <NavegacionMes
            v-else
            class="programacion__mes"
            :etiqueta="mesTexto"
            @anterior="cambiarMes(-1)"
            @siguiente="cambiarMes(1)"
            @hoy="irMesActual"
          />

          <span
            class="programacion__estado"
            :class="{ 'programacion__estado--pendiente': hayCambios }"
          >
            <span class="programacion__estado-punto" aria-hidden="true"></span>
            {{ hayCambios ? 'Sin guardar' : 'Guardado' }}
          </span>
        </template>
        <span class="barra__espacio"></span>
        <SelectButton
          v-model="modo"
          :opciones="opcionesModo"
          aria-label="Modo de edición"
          compacto
        />
        <template v-if="modo !== 'calendario-escolar'">
          <MenuAcciones
            texto="Acciones"
            :acciones="accionesSecundarias()"
            @accion="ejecutarAccionSecundaria"
          />
          <button
            class="boton boton--principal"
            type="button"
            :disabled="exportandoPdf || guardando"
            @click="exportarPdf"
          >
            {{ exportandoPdf ? 'Generando PDF…' : 'Exportar PDF' }}
          </button>
        </template>
      </div>

      <div v-if="mostrarImportar" class="programacion__importar tarjeta">
        <div class="entrega-form__seccion-cabecera">
          <div>
            <h3>Importar días</h3>
            <p class="tenue">
              Acepta <span class="monospace">["2026-09-15", …]</span> o
              <span class="monospace">[{ "fecha": "2026-09-15", "contenido": "…" }]</span>. Se
              añaden los días que no existan; los que ya están no se tocan.
            </p>
          </div>
        </div>
        <div class="barra">
          <button class="boton" type="button" @click="ficheroImportar?.click()">
            Elegir fichero…
          </button>
          <input
            ref="ficheroImportar"
            class="visualmente-oculto"
            type="file"
            accept=".json,.csv,.tsv,.txt,application/json,text/csv,text/tab-separated-values,text/plain"
            @change="alElegirFichero"
          />
          <span class="tenue">o pega el JSON abajo</span>
        </div>
        <textarea
          v-model="textoImportar"
          rows="5"
          class="monospace"
          placeholder="28/10/2026&#9;Presentación&#9;&#9;Aula 3"
        ></textarea>
        <p v-if="errorImportar" class="aviso aviso--error" role="alert">{{ errorImportar }}</p>
        <div class="criterios__pie-fila">
          <button class="boton" type="button" @click="mostrarImportar = false">Cancelar</button>
          <span class="barra__espacio"></span>
          <button
            class="boton boton--principal"
            type="button"
            :disabled="!textoImportar.trim()"
            @click="importarPegado"
          >
            Importar
          </button>
        </div>
      </div>

      <CalendarioEscolarPanel
        v-if="modo === 'calendario-escolar'"
        :curso-academico-id="grupo.curso_academico_id"
        :grupo-clase-id="grupo.id"
      />

      <div
        v-else
        class="programacion__layout"
        :class="{
          'programacion__layout--tabla': modo === 'tabla',
          'programacion__layout--unidades': modo === 'unidades'
        }"
      >
        <section class="programacion__principal">
          <UnidadesProgramacion
            v-if="modo === 'unidades'"
            :grupo="grupo"
            @actualizado="cargarUnidades"
          />
          <template v-else-if="modo === 'tarjetas'">
            <div v-if="filas.length === 0" class="vacio">
              <p>
                Todavía no hay días registrados. Añade el primero desde el formulario o importa un
                listado JSON.
              </p>
            </div>
            <div v-else-if="filasVisibles.length === 0" class="vacio">
              <p>
                No hay días entre el {{ fechaCorta(inicioQuincena) }} y el {{ fechaCorta(limite) }}.
              </p>
              <button class="boton" type="button" @click="verTodo = true">Ver todo</button>
            </div>

            <div v-else class="programacion__lista">
              <article
                v-for="(fila, indice) in filasVisibles"
                :key="fila.id || `${fila.fecha}-${indice}`"
                class="programacion__dia"
                :class="{
                  'programacion__dia--editando': editando === fila,
                  'programacion__dia--sin-contenido': !fila.contenido.trim()
                }"
              >
                <div class="programacion__fecha">
                  <strong>{{ partesFecha(fila.fecha).dia }}</strong>
                  <span>{{ partesFecha(fila.fecha).mes }}</span>
                  <small>{{ partesFecha(fila.fecha).semana }}</small>
                </div>
                <div class="programacion__detalle">
                  <h4>{{ fila.contenido.trim() || 'Sin contenido' }}</h4>
                  <span v-if="fila.hora" class="chip">{{ fila.hora }}</span>
                  <span v-if="unidadDe(fila)" class="chip">
                    {{ unidadDe(fila)?.codigo ?? 'Unidad' }} · {{ unidadDe(fila)?.nombre }}
                  </span>
                  <p v-if="desviacionReal(fila)" class="programacion__desviacion">
                    <strong>Desviación:</strong> {{ desviacionReal(fila) }}
                  </p>
                  <p v-if="fila.observaciones.trim()" class="tenue programacion__observaciones">
                    {{ fila.observaciones }}
                  </p>
                  <span v-if="!fila.contenido.trim()" class="chip chip--aviso">
                    falta contenido
                  </span>
                </div>
                <div class="programacion__acciones-dia">
                  <button
                    class="icono-accion"
                    type="button"
                    aria-label="Editar día"
                    data-tooltip="Editar día"
                    @click="editarFila(fila)"
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
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    class="icono-accion icono-accion--peligro"
                    type="button"
                    aria-label="Quitar día"
                    data-tooltip="Quitar día"
                    @click="filaABorrar = fila"
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
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </div>
              </article>
            </div>

            <div class="criterios__pie-fila">
              <button class="boton boton--sutil" type="button" @click="nuevaFila()">
                Añadir día
              </button>
              <span class="barra__espacio"></span>
              <span class="tenue">
                <template v-if="verTodo">{{ filas.length }} días</template>
                <template v-else>{{ filasVisibles.length }} de {{ filas.length }} días</template>
              </span>
            </div>
          </template>
          <div v-else-if="modo === 'tabla'" class="tarjeta programacion__tabla-tarjeta">
            <div class="programacion__tabla-cabecera">
              <div>
                <h3>Edición rápida</h3>
                <p class="tenue">
                  Escribe directamente en la tabla. Puedes añadir filas y moverte con Tab.
                </p>
              </div>
            </div>

            <div v-if="filasVisibles.length === 0" class="vacio">
              <p>No hay días en esta vista.</p>
              <button class="boton" type="button" @click="nuevaFilaTabla">Añadir fila</button>
            </div>

            <div v-else class="tabla-scroll">
              <table class="tabla programacion__tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Unidad</th>
                    <th>Contenido / actividad</th>
                    <th>Desviación</th>
                    <th>Observaciones</th>
                    <th class="acciones"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(fila, indiceFila) in filasVisibles"
                    :key="fila.id || `${fila.fecha}-${indiceFila}`"
                  >
                    <td><input v-model="fila.fecha" type="date" /></td>
                    <td><input v-model="fila.hora" type="time" /></td>
                    <td>
                      <select v-model="fila.unidad_id">
                        <option :value="null">Sin asignar</option>
                        <option v-for="unidad in unidades" :key="unidad.id" :value="unidad.id">
                          {{ unidad.codigo ?? unidad.nombre }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <textarea
                        v-model="fila.contenido"
                        rows="2"
                        placeholder="Lo que se trabajó"
                      ></textarea>
                    </td>
                    <td>
                      <textarea
                        v-model="fila.desviacion"
                        rows="2"
                        placeholder="Sin desviación"
                      ></textarea>
                    </td>
                    <td>
                      <textarea
                        v-model="fila.observaciones"
                        rows="2"
                        placeholder="Notas"
                      ></textarea>
                    </td>
                    <td class="acciones">
                      <button
                        class="icono-accion icono-accion--peligro"
                        type="button"
                        aria-label="Quitar fila"
                        data-tooltip="Quitar fila"
                        @click="filaABorrar = fila"
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
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="criterios__pie-fila">
              <button class="boton boton--sutil" type="button" @click="nuevaFilaTabla">
                Añadir fila
              </button>
              <span class="barra__espacio"></span>
              <span class="tenue">{{ filasVisibles.length }} de {{ filas.length }} días</span>
            </div>
          </div>

          <div v-else class="tarjeta programacion__calendario">
            <div class="programacion__calendario-scroll">
              <div class="programacion__calendario-grid">
                <div
                  v-for="dia in DIAS_SEMANA"
                  :key="dia"
                  class="programacion__calendario-dia-semana"
                >
                  {{ dia }}
                </div>
                <button
                  v-for="celda in celdasCalendario"
                  :key="celda.fecha"
                  class="programacion__celda"
                  :class="{
                    'programacion__celda--fuera': !celda.esMes,
                    'programacion__celda--hoy': celda.esHoy,
                    'programacion__celda--editando': editando?.fecha === celda.fecha
                  }"
                  type="button"
                  @click="seleccionarDia(celda.fecha)"
                >
                  <span class="programacion__celda-numero">{{ celda.dia }}</span>
                  <span v-if="celda.filas.length > 0" class="programacion__celda-sesion">
                    {{ celda.filas[0].contenido || 'Sin contenido' }}
                    <small v-if="celda.filas.length > 1">+{{ celda.filas.length - 1 }}</small>
                  </span>
                  <span
                    v-if="celda.filas.some((fila) => desviacionReal(fila))"
                    class="programacion__celda-desviacion"
                  >
                    Desviación
                  </span>
                  <span v-else-if="celda.filas.length === 0" class="programacion__celda-mas"
                    >+</span
                  >
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside v-if="modo !== 'tabla' && modo !== 'unidades'" class="programacion__lateral">
          <form class="tarjeta programacion__formulario" @submit.prevent="guardarDia">
            <header class="entrega-form__seccion-cabecera">
              <div>
                <h3>{{ editando ? 'Editar día' : 'Añadir día' }}</h3>
                <p class="tenue">
                  {{
                    editando
                      ? `Editando el ${fechaCorta(form.fecha)}`
                      : 'Registra una sesión y añádela a la programación.'
                  }}
                </p>
              </div>
              <span v-if="editando" class="chip chip--aviso">editando</span>
            </header>

            <div class="formulario">
              <div class="campo campo--ancho">
                <label for="programacion-fecha">Fecha *</label>
                <input id="programacion-fecha" v-model="form.fecha" type="date" required />
              </div>
              <div class="campo">
                <label for="programacion-hora">Hora</label>
                <input id="programacion-hora" v-model="form.hora" type="time" />
              </div>
              <div class="campo campo--ancho">
                <label for="programacion-unidad">Unidad de programación</label>
                <select id="programacion-unidad" v-model="form.unidad_id">
                  <option :value="null">Sin asignar</option>
                  <option v-for="unidad in unidades" :key="unidad.id" :value="unidad.id">
                    {{ unidad.codigo ? `${unidad.codigo} · ` : '' }}{{ unidad.nombre }}
                  </option>
                </select>
              </div>
              <div class="campo campo--ancho">
                <label for="programacion-contenido">Contenido / actividad</label>
                <textarea
                  id="programacion-contenido"
                  v-model="form.contenido"
                  rows="4"
                  placeholder="Qué se trabajó en la sesión…"
                ></textarea>
              </div>
              <div class="campo campo--ancho">
                <label for="programacion-desviacion">Desviación</label>
                <textarea
                  id="programacion-desviacion"
                  v-model="form.desviacion"
                  rows="2"
                  placeholder="Solo si se apartó de lo planificado"
                ></textarea>
              </div>
              <div class="campo campo--ancho">
                <label for="programacion-observaciones">Observaciones</label>
                <textarea
                  id="programacion-observaciones"
                  v-model="form.observaciones"
                  rows="2"
                  placeholder="Notas para el seguimiento"
                ></textarea>
              </div>
            </div>

            <div class="programacion__formulario-acciones">
              <button class="boton boton--principal" type="submit" :disabled="!puedeGuardarDia">
                {{ editando ? 'Guardar día' : 'Añadir a la programación' }}
              </button>
              <button v-if="editando" class="boton" type="button" @click="cancelarEdicion">
                Cancelar edición
              </button>
            </div>
          </form>

          <div class="tarjeta">
            <h3>Resumen</h3>
            <ul class="programacion__resumen">
              <li>
                <span>Días totales</span>
                <strong>{{ filas.length }}</strong>
              </li>
              <li>
                <span>En la quincena</span>
                <strong>{{ filasVisibles.length }}</strong>
              </li>
              <li>
                <span>Sin contenido</span>
                <strong :class="sinContenido > 0 ? 'nota-suspendido' : ''">
                  {{ sinContenido }}
                </strong>
              </li>
              <li>
                <span>Con desviación</span>
                <strong>{{ conDesviacion }}</strong>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <div
        v-if="hayCambios || guardando"
        class="programacion__acciones programacion__acciones--sticky"
      >
        <span class="tenue">Hay cambios en la programación pendientes de guardar.</span>
        <span class="barra__espacio"></span>
        <button class="boton boton--principal" type="button" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : 'Guardar programación' }}
        </button>
      </div>

      <Confirmacion
        v-if="filaABorrar"
        titulo="¿Quitar el día de la programación?"
        etiqueta-confirmar="Sí, quitar"
        peligro
        :ocupado="borrando"
        @cancelar="filaABorrar = null"
        @confirmar="quitar"
      >
        <p>
          Se quitará el <strong>{{ fechaCorta(filaABorrar.fecha) }}</strong> de la programación.
        </p>
        <p class="tenue">Tendrás que guardar la programación para que el cambio sea definitivo.</p>
      </Confirmacion>
    </template>
  </div>
</template>

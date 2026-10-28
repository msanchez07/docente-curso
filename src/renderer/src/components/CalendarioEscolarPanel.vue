<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import { ESQUEMA_CALENDARIO } from '@shared/esquemas-importacion'
import { descargarJson } from '@renderer/utils/descargar-json'
import type {
  DiaCalendario,
  ProgramacionAula,
  TipoDiaCalendario,
  UnidadProgramacion
} from '@shared/tipos'

const props = defineProps<{ cursoAcademicoId: number; grupoClaseId?: number }>()

const dias = ref<DiaCalendario[]>([])
const unidades = ref<UnidadProgramacion[]>([])
const programacion = ref<ProgramacionAula[]>([])
const PALETA_UNIDADES = [
  '#2563eb',
  '#0891b2',
  '#7c3aed',
  '#db2777',
  '#d97706',
  '#16a34a',
  '#0f766e',
  '#9333ea',
  '#dc2626',
  '#475569'
]
const cargando = ref(true)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const mostrarImportar = ref(false)
const textoImportar = ref('')
const ficheroImportar = ref<HTMLInputElement | null>(null)
const importando = ref(false)
const errorImportar = ref<string | null>(null)
const confirmarVaciar = ref(false)
const vaciando = ref(false)
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const hoy = new Date()
const mesCalendario = ref(new Date(hoy.getFullYear(), hoy.getMonth(), 1))

const mapaDias = computed(() => new Map(dias.value.map((dia) => [dia.fecha, dia])))

const unidadPorFecha = computed(() => {
  const porId = new Map(unidades.value.map((unidad) => [unidad.id, unidad]))
  const mapa = new Map<string, UnidadProgramacion>()
  for (const sesion of programacion.value) {
    if (!sesion.unidad_id) continue
    const unidad = porId.get(sesion.unidad_id)
    if (unidad) mapa.set(sesion.fecha, unidad)
  }
  return mapa
})

const unidadesConSesiones = computed(() => {
  const ids = new Set(
    programacion.value.map((sesion) => sesion.unidad_id).filter((id): id is number => id !== null)
  )
  return unidades.value
    .filter((unidad) => ids.has(unidad.id))
    .sort((a, b) => (a.codigo ?? a.nombre).localeCompare(b.codigo ?? b.nombre))
})

function colorUnidad(unidad: UnidadProgramacion): string {
  return PALETA_UNIDADES[unidad.id % PALETA_UNIDADES.length]
}

function unidadDeCelda(fecha: string): UnidadProgramacion | undefined {
  return unidadPorFecha.value.get(fecha)
}

function colorCelda(fecha: string): string {
  const unidad = unidadDeCelda(fecha)
  return unidad ? colorUnidad(unidad) : ''
}

function etiquetaUnidad(fecha: string): string {
  const unidad = unidadDeCelda(fecha)
  return unidad ? (unidad.codigo ?? unidad.nombre) : ''
}

const mesTexto = computed(() => {
  const texto = mesCalendario.value.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

const celdasCalendario = computed(() => {
  const anio = mesCalendario.value.getFullYear()
  const mes = mesCalendario.value.getMonth()
  const primero = new Date(anio, mes, 1)
  const desplazamiento = (primero.getDay() + 6) % 7
  const inicio = new Date(anio, mes, 1 - desplazamiento)
  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()
  const celdas: {
    fecha: string
    dia: number
    esMes: boolean
    esHoy: boolean
    diaCalendario: DiaCalendario | undefined
  }[] = []
  for (let i = 0; i < 42; i++) {
    const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)
    const iso = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
    celdas.push({
      fecha: iso,
      dia: fecha.getDate(),
      esMes: fecha.getMonth() === mes,
      esHoy: fecha.getTime() === hoyLocal,
      diaCalendario: mapaDias.value.get(iso)
    })
  }
  return celdas
})

const diasDelMes = computed(() => {
  const anio = mesCalendario.value.getFullYear()
  const mes = mesCalendario.value.getMonth()
  return dias.value.filter((dia) => {
    const fecha = new Date(`${dia.fecha}T00:00:00`)
    return fecha.getFullYear() === anio && fecha.getMonth() === mes
  })
})

function cambiarMes(delta: number): void {
  mesCalendario.value = new Date(
    mesCalendario.value.getFullYear(),
    mesCalendario.value.getMonth() + delta,
    1
  )
}

function irMesActual(): void {
  mesCalendario.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
}

function claseTipo(tipo: TipoDiaCalendario): string {
  return `calendario-escolar__celda--${tipo.replace('_', '-')}`
}

const etiquetas: Record<TipoDiaCalendario, string> = {
  lectivo: 'Lectivo',
  no_lectivo: 'No lectivo',
  festivo: 'Festivo',
  vacaciones: 'Vacaciones'
}

const conteo = computed(() => {
  const resultado: Record<TipoDiaCalendario, number> = {
    lectivo: 0,
    no_lectivo: 0,
    festivo: 0,
    vacaciones: 0
  }
  for (const dia of dias.value) resultado[dia.tipo] += 1
  return resultado
})

function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    const [diasCalendario, listaUnidades, sesiones] = await Promise.all([
      window.api.calendarioEscolar.listar(props.cursoAcademicoId),
      props.grupoClaseId
        ? window.api.unidadesProgramacion.listar(props.grupoClaseId)
        : Promise.resolve([]),
      props.grupoClaseId ? window.api.programacion.listar(props.grupoClaseId) : Promise.resolve([])
    ])
    dias.value = diasCalendario
    unidades.value = listaUnidades
    programacion.value = sesiones
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(() => [props.cursoAcademicoId, props.grupoClaseId], cargar)

function abrirImportar(): void {
  mostrarImportar.value = true
  textoImportar.value = ''
  errorImportar.value = null
  mensaje.value = null
}

function exportarEsquema(): void {
  descargarJson('esquema-calendario-escolar.json', ESQUEMA_CALENDARIO)
}

async function importarTexto(texto: string): Promise<void> {
  if (!texto.trim()) return
  importando.value = true
  errorImportar.value = null
  try {
    const resultado = await window.api.calendarioEscolar.importar(props.cursoAcademicoId, texto)
    await cargar()
    mensaje.value = `${resultado.creados} día(s) importados.`
    errorImportar.value =
      resultado.errores.length > 0 ? resultado.errores.slice(0, 6).join(' · ') : null
    if (resultado.creados > 0) mostrarImportar.value = false
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
  const archivo = entrada.files?.[0]
  if (!archivo) return
  try {
    await importarTexto(await archivo.text())
  } finally {
    entrada.value = ''
  }
}

async function vaciar(): Promise<void> {
  vaciando.value = true
  error.value = null
  try {
    await window.api.calendarioEscolar.vaciar(props.cursoAcademicoId)
    dias.value = []
    confirmarVaciar.value = false
    mensaje.value = 'Calendario escolar vaciado.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    vaciando.value = false
  }
}
</script>

<template>
  <section class="tarjeta calendario-escolar">
    <div class="cabecera-criterios">
      <div class="cabecera-criterios__titulo">
        <h3>Calendario escolar</h3>
        <span class="tenue">
          {{ dias.length }} días · {{ conteo.lectivo }} lectivos · {{ conteo.festivo }} festivos ·
          {{ conteo.vacaciones }} vacaciones
        </span>
      </div>
      <div class="cabecera-criterios__acciones">
        <button class="boton" type="button" @click="abrirImportar">Importar calendario</button>
        <button class="boton" type="button" @click="exportarEsquema">Descargar esquema</button>
        <button
          v-if="dias.length > 0"
          class="boton boton--peligro"
          type="button"
          @click="confirmarVaciar = true"
        >
          Vaciar
        </button>
      </div>
    </div>

    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

    <div v-if="mostrarImportar" class="programacion__importar">
      <p class="tenue">
        Acepta un array, <span class="monospace">{ "dias": [...] }</span> o listas por tipo:
        <span class="monospace">{ "festivos": ["2026-10-12"], "vacaciones": [...] }</span>. Los
        tipos son <span class="monospace">lectivo</span>, <span class="monospace">no_lectivo</span>,
        <span class="monospace">festivo</span> y <span class="monospace">vacaciones</span>. Al
        importar se sustituye el calendario del curso.
      </p>
      <div class="barra">
        <button class="boton" type="button" @click="ficheroImportar?.click()">
          Elegir fichero…
        </button>
        <input
          ref="ficheroImportar"
          hidden
          type="file"
          accept=".json,application/json"
          @change="alElegirFichero"
        />
        <span class="tenue">o pega el JSON abajo</span>
      </div>
      <textarea
        v-model="textoImportar"
        rows="6"
        class="monospace"
        placeholder='{
  "festivos": ["2026-10-12", "2026-11-02"],
  "no_lectivos": ["2026-12-07"],
  "vacaciones": ["2026-12-23"]
}'
      ></textarea>
      <p v-if="errorImportar" class="aviso aviso--error" role="alert">{{ errorImportar }}</p>
      <div class="criterios__pie-fila">
        <button class="boton" type="button" @click="mostrarImportar = false">Cancelar</button>
        <span class="barra__espacio"></span>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="importando || !textoImportar.trim()"
          @click="importarPegado"
        >
          {{ importando ? 'Importando…' : 'Importar' }}
        </button>
      </div>
    </div>

    <div v-if="cargando" class="vacio">Cargando calendario…</div>
    <template v-else>
      <div class="calendario-escolar__barra">
        <button class="boton boton--sutil" type="button" @click="cambiarMes(-1)">←</button>
        <strong>{{ mesTexto }}</strong>
        <button class="boton boton--sutil" type="button" @click="cambiarMes(1)">→</button>
        <button class="boton boton--sutil" type="button" @click="irMesActual">Hoy</button>
        <span class="barra__espacio"></span>
        <div class="calendario-escolar__leyenda" aria-label="Tipos de día">
          <span
            ><i class="calendario-escolar__punto calendario-escolar__punto--lectivo"></i
            >Lectivo</span
          >
          <span
            ><i class="calendario-escolar__punto calendario-escolar__punto--no-lectivo"></i>No
            lectivo</span
          >
          <span
            ><i class="calendario-escolar__punto calendario-escolar__punto--festivo"></i
            >Festivo</span
          >
          <span
            ><i class="calendario-escolar__punto calendario-escolar__punto--vacaciones"></i
            >Vacaciones</span
          >
        </div>
      </div>

      <p v-if="dias.length === 0" class="tenue calendario-escolar__ayuda">
        Todavía no hay días importados. Importa el calendario del curso para marcar festivos,
        vacaciones y días no lectivos.
      </p>

      <div class="calendario-escolar__grid" role="grid" aria-label="Calendario escolar">
        <div
          v-for="dia in DIAS_SEMANA"
          :key="dia"
          class="calendario-escolar__semana"
          role="columnheader"
        >
          {{ dia }}
        </div>
        <div
          v-for="celda in celdasCalendario"
          :key="celda.fecha"
          class="calendario-escolar__celda"
          role="gridcell"
          :class="[
            !celda.esMes ? 'calendario-escolar__celda--fuera' : '',
            celda.esHoy ? 'calendario-escolar__celda--hoy' : '',
            celda.diaCalendario ? claseTipo(celda.diaCalendario.tipo) : '',
            unidadDeCelda(celda.fecha) ? 'calendario-escolar__celda--unidad' : ''
          ]"
          :title="
            [
              fechaCorta(celda.fecha),
              celda.diaCalendario ? etiquetas[celda.diaCalendario.tipo] : '',
              celda.diaCalendario?.descripcion ?? '',
              etiquetaUnidad(celda.fecha)
            ]
              .filter(Boolean)
              .join(' · ')
          "
          :aria-label="
            celda.diaCalendario
              ? `${fechaCorta(celda.fecha)}: ${etiquetas[celda.diaCalendario.tipo]}`
              : fechaCorta(celda.fecha)
          "
        >
          <span
            v-if="unidadDeCelda(celda.fecha)"
            class="calendario-escolar__unidad-barra"
            :style="{ background: colorCelda(celda.fecha) }"
          ></span>
          <span class="calendario-escolar__numero">{{ celda.dia }}</span>
          <span
            v-if="unidadDeCelda(celda.fecha)"
            class="calendario-escolar__unidad-chip"
            :style="{ background: colorCelda(celda.fecha) }"
          >
            {{ etiquetaUnidad(celda.fecha) }}
          </span>
          <span v-if="celda.diaCalendario" class="calendario-escolar__marca">
            {{ etiquetas[celda.diaCalendario.tipo] }}
          </span>
          <span v-if="celda.diaCalendario?.descripcion" class="calendario-escolar__descripcion">
            {{ celda.diaCalendario.descripcion }}
          </span>
        </div>
      </div>

      <div
        v-if="unidadesConSesiones.length > 0"
        class="calendario-escolar__leyenda calendario-escolar__leyenda--unidades"
      >
        <strong>Unidades:</strong>
        <span v-for="unidad in unidadesConSesiones" :key="unidad.id">
          <i class="calendario-escolar__punto" :style="{ background: colorUnidad(unidad) }"></i>
          {{ unidad.codigo ?? unidad.nombre }}
        </span>
      </div>

      <div v-if="diasDelMes.length > 0" class="calendario-escolar__lista">
        <h4>Días señalados este mes</h4>
        <ul>
          <li v-for="dia in diasDelMes" :key="dia.id">
            <span class="monospace">{{ fechaCorta(dia.fecha) }}</span>
            <span
              class="chip"
              :class="{
                'chip--ok': dia.tipo === 'lectivo',
                'chip--aviso': dia.tipo === 'no_lectivo' || dia.tipo === 'festivo',
                'chip--peligro': dia.tipo === 'vacaciones'
              }"
            >
              {{ etiquetas[dia.tipo] }}
            </span>
            <span class="tenue">{{ dia.descripcion ?? '—' }}</span>
          </li>
        </ul>
      </div>
    </template>

    <Confirmacion
      v-if="confirmarVaciar"
      titulo="¿Vaciar el calendario escolar?"
      etiqueta-confirmar="Sí, vaciar"
      peligro
      :ocupado="vaciando"
      @cancelar="confirmarVaciar = false"
      @confirmar="vaciar"
    >
      <p>Se borrarán todos los días importados para este curso académico.</p>
    </Confirmacion>
  </section>
</template>

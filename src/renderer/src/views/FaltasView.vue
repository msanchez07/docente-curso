<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import { extraerFaltasPdf } from '@renderer/utils/faltas-pdf'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import type { AjustesFaltas, DatosFaltas, FilaFaltas, GrupoClase } from '@shared/tipos'

const route = useRoute()
const store = useGruposClaseStore()
const grupo = ref<GrupoClase | null>(null)
const datos = ref<DatosFaltas | null>(null)
const ajustes = ref<AjustesFaltas>({
  horas: 0,
  limite: 15,
  incluirJustificadas: false,
  codigoInforme: ''
})
const cargando = ref(true)
const guardando = ref(false)
const importando = ref(false)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const ficheroPdf = ref<HTMLInputElement | null>(null)

const id = computed(() => Number(route.params.grupoId))

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function total(fila: FilaFaltas): number {
  return fila.faltas + (ajustes.value.incluirJustificadas ? fila.justificadas : 0)
}

function porcentaje(fila: FilaFaltas): number {
  if (ajustes.value.horas <= 0) return 0
  return Math.round((total(fila) / ajustes.value.horas) * 100)
}

function estado(fila: FilaFaltas): { texto: string; clase: string } {
  const valor = porcentaje(fila)
  if (valor >= ajustes.value.limite) return { texto: 'Pérdida', clase: 'faltas__estado--peligro' }
  if (valor >= ajustes.value.limite * 0.66)
    return { texto: 'Riesgo', clase: 'faltas__estado--aviso' }
  if (valor >= ajustes.value.limite * 0.33)
    return { texto: 'Aviso', clase: 'faltas__estado--proximo' }
  if (valor > 0) return { texto: 'Correcto', clase: 'faltas__estado--ok' }
  return { texto: 'Sin faltas', clase: 'faltas__estado--ok' }
}

function filaClase(fila: FilaFaltas): string {
  return estado(fila).clase
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
    datos.value = await window.api.faltas.obtener(grupo.value.id)
    ajustes.value = { ...datos.value.ajustes }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(id, cargar)

async function guardarAjustes(): Promise<void> {
  if (!grupo.value) return
  guardando.value = true
  error.value = null
  mensaje.value = null
  try {
    datos.value = await window.api.faltas.guardarAjustes(grupo.value.id, ajustes.value)
    ajustes.value = { ...datos.value.ajustes }
    mensaje.value = 'Ajustes de faltas guardados.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function guardarFilas(): Promise<void> {
  if (!grupo.value || !datos.value) return
  guardando.value = true
  error.value = null
  mensaje.value = null
  try {
    datos.value = await window.api.faltas.guardarFilas(
      grupo.value.id,
      datos.value.filas.map((fila) => ({
        alumnoId: fila.alumno.id,
        faltas: fila.faltas,
        justificadas: fila.justificadas
      }))
    )
    mensaje.value = 'Faltas guardadas.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

function elegirPdf(): void {
  ficheroPdf.value?.click()
}

async function alElegirPdf(evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement
  const archivo = entrada.files?.[0]
  if (!archivo || !datos.value) return
  importando.value = true
  error.value = null
  mensaje.value = null
  try {
    const filasPdf = await extraerFaltasPdf(archivo, ajustes.value.incluirJustificadas)
    const codigo = ajustes.value.codigoInforme || Object.keys(filasPdf[0]?.modulos ?? {})[0] || ''
    if (!codigo) {
      error.value = 'El PDF no contiene módulos reconocibles. Revisa el código del informe.'
      return
    }
    let aplicadas = 0
    let sinCoincidencia = 0
    for (const fila of datos.value.filas) {
      const buscado = normalizar(`${fila.alumno.nombre} ${fila.alumno.apellidos}`)
      const encontrada = filasPdf.find((pdf) => normalizar(pdf.nombre) === buscado)
      if (!encontrada) {
        sinCoincidencia++
        continue
      }
      fila.faltas = encontrada.modulos[codigo] ?? 0
      fila.justificadas = 0
      aplicadas++
    }
    mensaje.value = `PDF importado: ${aplicadas} alumnos actualizados${
      sinCoincidencia > 0 ? `; ${sinCoincidencia} sin coincidencia por nombre` : ''
    }. Revisa y guarda.`
    if (sinCoincidencia > 0) {
      error.value =
        'Algunos alumnos del PDF no coinciden por nombre con el alumnado del grupo. Revisa las filas manualmente.'
    }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    importando.value = false
    entrada.value = ''
  }
}

function imprimir(): void {
  if (!grupo.value || !datos.value) return
  const filas = datos.value.filas
    .map(
      (fila) =>
        `<tr><td>${fila.alumno.apellidos}, ${fila.alumno.nombre}</td><td>${fila.faltas}</td><td>${fila.justificadas}</td><td>${total(fila)}</td><td>${porcentaje(fila)} %</td><td>${estado(fila).texto}</td></tr>`
    )
    .join('')
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Faltas · ${grupo.value.nombre}</title>
  <style>@page{size:A4 landscape;margin:14mm}body{font:11px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d2939}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 12px;color:#667085}table{width:100%;border-collapse:collapse}th{background:#eef4f8;color:#36536b;text-align:left;padding:7px;border-bottom:2px solid #cfdae5;font-size:9px;text-transform:uppercase}td{padding:7px;border-bottom:1px solid #e7edf3}tr:nth-child(even) td{background:#fbfcfd}</style></head><body>
  <h1>Control de faltas</h1><p>${grupo.value.nombre} · ${ajustes.value.codigoInforme} · límite ${ajustes.value.limite} % · ${ajustes.value.horas} h</p>
  <table><thead><tr><th>Alumno/a</th><th>Faltas</th><th>Justificadas</th><th>Total</th><th>%</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>
  </body></html>`
  const ventana = window.open('', 'faltas-impresion', 'width=1100,height=800')
  if (!ventana) return
  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
  window.setTimeout(() => ventana.print(), 250)
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver :a="grupo ? { name: 'grupo', params: { id: grupo.id } } : '/grupos'" />

    <div v-if="cargando" class="vacio">Cargando faltas…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

    <template v-if="grupo && datos">
      <header class="vista__cabecera">
        <h2>Control de faltas</h2>
        <p class="tenue">{{ grupo.nombre }} · Curso {{ grupo.curso_academico_nombre }}</p>
      </header>

      <section class="tarjeta faltas__ajustes">
        <header class="dashboard__tarjeta-cabecera">
          <div>
            <h3>Ajustes de cálculo</h3>
            <p class="tenue">Horas del módulo, límite y código del PDF de ITACA.</p>
          </div>
          <button
            class="boton boton--principal"
            type="button"
            :disabled="guardando"
            @click="guardarAjustes"
          >
            {{ guardando ? 'Guardando…' : 'Guardar ajustes' }}
          </button>
        </header>
        <div class="formulario">
          <div class="campo">
            <label for="faltas-horas">Horas totales del módulo</label>
            <input
              id="faltas-horas"
              v-model.number="ajustes.horas"
              type="number"
              min="1"
              step="1"
            />
          </div>
          <div class="campo">
            <label for="faltas-limite">Límite de faltas (%)</label>
            <input
              id="faltas-limite"
              v-model.number="ajustes.limite"
              type="number"
              min="1"
              max="100"
            />
          </div>
          <div class="campo">
            <label for="faltas-codigo">Código en el informe</label>
            <input id="faltas-codigo" v-model="ajustes.codigoInforme" placeholder="Ej. DWES" />
          </div>
          <div class="campo faltas__check">
            <label>
              <input v-model="ajustes.incluirJustificadas" type="checkbox" />
              Contar faltas justificadas
            </label>
          </div>
        </div>
      </section>

      <section class="tarjeta">
        <header class="dashboard__tarjeta-cabecera">
          <div>
            <h3>Alumnado</h3>
            <p class="tenue">
              {{ datos.filas.length }} alumnos · {{ ajustes.horas }} horas · {{ ajustes.limite }} %
              de límite
            </p>
          </div>
          <div class="faltas__acciones">
            <input
              ref="ficheroPdf"
              class="visualmente-oculto"
              type="file"
              accept=".pdf,application/pdf"
              @change="alElegirPdf"
            />
            <button class="boton" type="button" :disabled="importando" @click="elegirPdf">
              {{ importando ? 'Leyendo PDF…' : 'Importar PDF de faltas' }}
            </button>
            <button class="boton" type="button" @click="imprimir">Imprimir / PDF</button>
            <button
              class="boton boton--principal"
              type="button"
              :disabled="guardando"
              @click="guardarFilas"
            >
              {{ guardando ? 'Guardando…' : 'Guardar faltas' }}
            </button>
          </div>
        </header>

        <div v-if="datos.filas.length === 0" class="vacio">
          No hay alumnado matriculado en este grupo.
        </div>
        <div v-else class="tabla-scroll">
          <table class="tabla faltas__tabla">
            <thead>
              <tr>
                <th>Alumno/a</th>
                <th class="num">Faltas</th>
                <th class="num">Justificadas</th>
                <th class="num">Total</th>
                <th class="num">%</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fila in datos.filas" :key="fila.alumno.id" :class="filaClase(fila)">
                <td>
                  <strong>{{ fila.alumno.apellidos }}, {{ fila.alumno.nombre }}</strong>
                  <span v-if="!fila.alumno.activo" class="chip">inactivo</span>
                </td>
                <td class="num">
                  <input
                    v-model.number="fila.faltas"
                    class="faltas__input"
                    type="number"
                    min="0"
                    step="0.5"
                  />
                </td>
                <td class="num">
                  <input
                    v-model.number="fila.justificadas"
                    class="faltas__input"
                    type="number"
                    min="0"
                    step="0.5"
                  />
                </td>
                <td class="num">
                  <strong>{{ total(fila) }}</strong>
                </td>
                <td class="num">
                  <strong>{{ porcentaje(fila) }} %</strong>
                </td>
                <td>
                  <span class="chip faltas__estado" :class="estado(fila).clase">{{
                    estado(fila).texto
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

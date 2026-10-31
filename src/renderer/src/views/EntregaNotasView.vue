<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SelectButton from '@renderer/components/SelectButton.vue'
import type {
  AlumnoClase,
  EntregaClase,
  GrupoClase,
  ModeloEvaluacion,
  NotaGuardadaClase,
  UnidadProgramacion
} from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import { generarHtmlFichaEntrega } from '@shared/entrega-ficha'
import { notificar } from '@renderer/composables/notificaciones'
import {
  abrirArchivoRubrica,
  descargarArchivoRubrica,
  tamanoBase64,
  tamanoLegible
} from '@renderer/utils/archivos'

interface FilaNota {
  alumno: AlumnoClase
  nota: number | ''
  observaciones: string
}

const route = useRoute()
const store = useGruposClaseStore()

const grupo = ref<GrupoClase | null>(null)
const entrega = ref<EntregaClase | null>(null)
const criterios = ref<ModeloEvaluacion | null>(null)
const unidades = ref<UnidadProgramacion[]>([])
const tab = ref<'ficha' | 'notas'>('ficha')
const filas = ref<FilaNota[]>([])
const cargando = ref(true)
const guardando = ref(false)
const desbloqueando = ref(false)
const error = ref<string | null>(null)
const errorGuardado = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const cabeceraHtml = ref('')

const grupoId = computed(() => Number(route.params.grupoId))
const entregaId = computed(() => Number(route.params.entregaId))

const opcionesTab = [
  { value: 'ficha', label: 'Ficha' },
  { value: 'notas', label: 'Notas' }
]

const unidad = computed(
  () => unidades.value.find((item) => item.id === entrega.value?.unidad_id) ?? null
)

const fichaHtml = computed(() => {
  if (!grupo.value || !entrega.value) return ''
  return `${cabeceraHtml.value}${generarHtmlFichaEntrega({
    grupo: grupo.value,
    entrega: entrega.value,
    unidad: unidad.value
  })}`
})

const fichaDocumento = computed(
  () =>
    `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>html,body{margin:0;padding:0;background:#f4f6f9}body{padding:0}*{box-sizing:border-box}@media print{html,body{background:#fff}body{padding:0}}</style></head><body>${fichaHtml.value}</body></html>`
)

const bloqueada = computed(() => entrega.value?.bloqueada ?? false)

const nombreCategoria = computed(
  () =>
    criterios.value?.categorias.find((c) => c.id === entrega.value?.categoria_id)?.nombre ??
    entrega.value?.categoria_id ??
    '—'
)

const conNota = computed(() => filas.value.filter((fila) => fila.nota !== '').length)

const media = computed(() => {
  const notas = filas.value
    .filter((fila) => fila.nota !== '')
    .map((fila) => Number(fila.nota))
    .filter((nota) => Number.isFinite(nota))
  if (notas.length === 0) return null
  return Math.round((notas.reduce((total, nota) => total + nota, 0) / notas.length) * 100) / 100
})

function fechaCorta(fecha: string | null): string {
  if (!fecha) return 'sin fecha'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function formato(nota: number | null): string {
  return nota === null ? '—' : nota.toFixed(2).replace('.', ',')
}

function filaDesdeNotas(alumno: AlumnoClase, notas: NotaGuardadaClase[]): FilaNota {
  const guardada = notas.find(
    (nota) => nota.alumno_id === alumno.id && nota.entrega_id === entregaId.value
  )
  return {
    alumno,
    nota: guardada?.nota ?? '',
    observaciones: guardada?.observaciones ?? ''
  }
}

async function cargarNotas(): Promise<void> {
  if (!grupo.value) return
  const [alumnos, notas] = await Promise.all([
    window.api.alumnosClase.listar(grupo.value.id),
    window.api.notasClase.listar(grupo.value.id)
  ])
  filas.value = alumnos
    .slice()
    .sort((a, b) => `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`))
    .map((alumno) => filaDesdeNotas(alumno, notas))
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  errorGuardado.value = null
  mensaje.value = null
  try {
    await store.cargar()
    grupo.value = store.grupo(grupoId.value)
    if (!grupo.value) {
      error.value = 'No se ha encontrado el grupo.'
      return
    }
    const [entregas, modelo, listaUnidades, cabecera] = await Promise.all([
      window.api.entregasClase.listar(grupo.value.id),
      window.api.criterios.obtener(grupo.value.id),
      window.api.unidadesProgramacion.listar(grupo.value.id),
      window.api.configuracion.cabeceraDocumento()
    ])
    cabeceraHtml.value = cabecera
    entrega.value = entregas.find((item) => item.id === entregaId.value) ?? null
    criterios.value = modelo
    unidades.value = listaUnidades
    if (!entrega.value) {
      error.value = 'No se ha encontrado la entrega.'
      return
    }
    await cargarNotas()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch([grupoId, entregaId], cargar)

async function copiarFicha(): Promise<void> {
  try {
    await navigator.clipboard.writeText(fichaHtml.value)
    mensaje.value = 'Ficha HTML copiada al portapapeles.'
    notificar(mensaje.value)
  } catch (e) {
    errorGuardado.value = (e as Error).message ?? String(e)
  }
}

function descargarFicha(): void {
  if (!entrega.value) return
  const blob = new Blob([fichaDocumento.value], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `ficha-${entrega.value.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`
  enlace.click()
  URL.revokeObjectURL(url)
}

function imprimirFicha(): void {
  const ventana = window.open('', '_blank', 'width=1120,height=860')
  if (!ventana) return
  ventana.document.open()
  ventana.document.write(fichaDocumento.value)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => ventana.print(), 300)
}

async function desbloquear(): Promise<void> {
  if (!entrega.value) return
  desbloqueando.value = true
  errorGuardado.value = null
  mensaje.value = null
  try {
    const actualizada = await window.api.entregasClase.bloquear(entrega.value.id, false)
    if (actualizada) entrega.value = actualizada
    mensaje.value = 'Entrega desbloqueada. Ya puedes editar las notas.'
    notificar(mensaje.value)
  } catch (e) {
    errorGuardado.value = (e as Error).message ?? String(e)
  } finally {
    desbloqueando.value = false
  }
}

async function guardar(): Promise<void> {
  if (!grupo.value || !entrega.value || bloqueada.value) return
  guardando.value = true
  errorGuardado.value = null
  mensaje.value = null
  try {
    for (const fila of filas.value) {
      const nota = fila.nota === '' ? null : Number(fila.nota)
      await window.api.notasClase.guardar(grupo.value.id, fila.alumno.id, [
        {
          entregaId: entrega.value.id,
          nota,
          observaciones: fila.observaciones.trim() || null
        }
      ])
    }
    mensaje.value = 'Notas y anotaciones guardadas.'
    notificar(mensaje.value)
    await cargarNotas()
  } catch (e) {
    errorGuardado.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <section class="vista vista--ancha">
    <div v-if="cargando && !entrega" class="vacio">Cargando entrega…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="entrega && grupo">
      <header class="entrega-notas__cabecera">
        <div>
          <h2>{{ entrega.titulo }}</h2>
          <p class="tenue">
            Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }} ·
            {{ unidad ? (unidad.codigo ?? unidad.nombre) : 'Sin unidad' }} · {{ nombreCategoria }} ·
            {{ fechaCorta(entrega.fecha_limite) }}
          </p>
        </div>
        <div class="entrega-notas__chips">
          <span v-if="bloqueada" class="chip chip--aviso">bloqueada</span>
          <span class="chip">{{ conNota }} de {{ filas.length }} con nota</span>
          <span class="chip">media {{ formato(media) }}</span>
          <RouterLink
            class="boton"
            :to="{
              name: 'entrega-evidencias',
              params: { grupoId: grupo.id, entregaId: entrega.id }
            }"
          >
            Evidencias ({{ entrega.evidencias }})
          </RouterLink>
        </div>
      </header>

      <div class="informe__controles">
        <SelectButton
          v-model="tab"
          :opciones="opcionesTab"
          aria-label="Vista de la entrega"
          compacto
        />
        <span class="barra__espacio"></span>
        <RouterLink
          v-if="tab === 'ficha'"
          class="boton"
          :to="{ name: 'entrega-editar', params: { grupoId: grupo.id, entregaId: entrega.id } }"
        >
          Editar ficha
        </RouterLink>
      </div>

      <p v-if="errorGuardado" class="aviso aviso--error" role="alert">{{ errorGuardado }}</p>

      <template v-if="tab === 'ficha'">
        <div class="barra">
          <button class="boton" type="button" @click="copiarFicha">Copiar HTML</button>
          <button class="boton" type="button" @click="descargarFicha">Descargar HTML</button>
          <button class="boton" type="button" @click="imprimirFicha">Imprimir / PDF</button>
        </div>
        <div class="ficha-preview">
          <iframe :srcdoc="fichaDocumento" title="Ficha HTML de la entrega"></iframe>
        </div>
      </template>

      <template v-else>
        <div v-if="bloqueada" class="aviso aviso--aviso" role="status">
          <span>
            Esta entrega está bloqueada. Las notas y anotaciones no se pueden cambiar hasta
            desbloquearla.
          </span>
          <button
            class="boton boton--sutil"
            type="button"
            :disabled="desbloqueando"
            @click="desbloquear"
          >
            {{ desbloqueando ? 'Desbloqueando…' : 'Desbloquear entrega' }}
          </button>
        </div>
        <div class="tarjeta entrega-notas__tarjeta-compacta">
          <div class="cabecera-criterios">
            <div class="cabecera-criterios__titulo">
              <h3>Rúbrica</h3>
              <span class="tenue">Criterios de corrección de la entrega</span>
            </div>
          </div>
          <p v-if="entrega.rubrica" class="entrega-notas__rubrica">{{ entrega.rubrica }}</p>

          <div v-if="entrega.rubrica_archivo" class="rubrica-archivo__actual">
            <span class="monospace">{{ entrega.rubrica_archivo.nombre }}</span>
            <span class="tenue">
              {{ tamanoLegible(tamanoBase64(entrega.rubrica_archivo.datos)) }}
            </span>
            <button
              class="boton boton--sutil"
              type="button"
              @click="abrirArchivoRubrica(entrega.rubrica_archivo)"
            >
              Abrir
            </button>
            <button
              class="boton boton--sutil"
              type="button"
              @click="descargarArchivoRubrica(entrega.rubrica_archivo)"
            >
              Descargar
            </button>
          </div>

          <p v-if="!entrega.rubrica && !entrega.rubrica_archivo" class="tenue">
            Esta entrega no tiene rúbrica asociada. Puedes añadirla editando la entrega.
          </p>
        </div>

        <div class="tarjeta entrega-notas__tarjeta-compacta">
          <div class="cabecera-criterios">
            <div class="cabecera-criterios__titulo">
              <h3>Notas por alumno</h3>
              <span class="tenue">
                Nota numérica (admite decimales) y anotaciones de texto para esta entrega.
              </span>
            </div>
            <div class="cabecera-criterios__acciones">
              <button
                class="boton boton--principal"
                type="button"
                :disabled="guardando || bloqueada || filas.length === 0"
                @click="guardar"
              >
                {{ guardando ? 'Guardando…' : 'Guardar notas' }}
              </button>
            </div>
          </div>

          <div v-if="filas.length === 0" class="vacio">
            No hay alumnado matriculado en este grupo.
          </div>

          <div v-else class="tabla-scroll">
            <table class="tabla entrega-notas__tabla">
              <thead>
                <tr>
                  <th>Alumno/a</th>
                  <th class="num">Nota (0–10)</th>
                  <th>Anotaciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="fila in filas" :key="fila.alumno.id">
                  <td>
                    {{ fila.alumno.apellidos }}, {{ fila.alumno.nombre }}
                    <span v-if="!fila.alumno.activo" class="chip">inactivo</span>
                  </td>
                  <td class="num entrega-notas__celda-nota">
                    <span v-if="fila.nota === ''" class="chip chip--aviso">sin nota</span>
                    <input
                      v-model="fila.nota"
                      class="entrega-notas__nota"
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      :disabled="bloqueada"
                      inputmode="decimal"
                      aria-label="Nota de la entrega"
                    />
                  </td>
                  <td>
                    <textarea
                      v-model="fila.observaciones"
                      rows="1"
                      placeholder="Observaciones, correcciones, acuerdos…"
                      :disabled="bloqueada"
                      aria-label="Anotaciones de la entrega"
                    ></textarea>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>

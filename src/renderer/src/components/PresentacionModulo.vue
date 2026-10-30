<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  construirDatosPresentacion,
  normalizarPresentacion,
  renderizarPlantilla
} from '@shared/presentacion'
import { PLANTILLA_PRESENTACION_POR_DEFECTO } from '@shared/presentacion-plantilla'
import type {
  EventoEvaluacionClase,
  GrupoClase,
  ModeloEvaluacion,
  PresentacionConfig,
  UnidadProgramacion
} from '@shared/tipos'

const props = defineProps<{ grupo: GrupoClase }>()

const config = ref<PresentacionConfig>(normalizarPresentacion(null))
const unidades = ref<UnidadProgramacion[]>([])
const modelo = ref<ModeloEvaluacion | null>(null)
const eventos = ref<EventoEvaluacionClase[]>([])
const cargando = ref(true)
const guardando = ref(false)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)

const html = computed(() => renderizarPlantilla(config.value.plantilla, datosPresentacion.value))

const datosPresentacion = computed(() =>
  construirDatosPresentacion(props.grupo, unidades.value, modelo.value, eventos.value, config.value)
)

const documentoHtml = computed(
  () => `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; background: #f4f6f9; }
    body { padding: 22px; }
    * { box-sizing: border-box; }
    @media print {
      html, body { background: #fff; }
      body { padding: 0; }
    }
  </style>
</head>
<body>${html.value}</body>
</html>`
)

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    const [listaUnidades, modeloGrupo, listaEventos, configuracion] = await Promise.all([
      window.api.unidadesProgramacion.listar(props.grupo.id),
      window.api.criterios.obtener(props.grupo.id),
      window.api.eventosEvaluacion.listar(props.grupo.id),
      window.api.presentacion.obtener()
    ])
    unidades.value = listaUnidades
    modelo.value = modeloGrupo
    eventos.value = listaEventos
    config.value = normalizarPresentacion(configuracion)
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

async function guardar(): Promise<void> {
  guardando.value = true
  error.value = null
  mensaje.value = null
  try {
    config.value = await window.api.presentacion.guardar(config.value)
    mensaje.value = 'Plantilla y datos de la presentación guardados.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

function restaurarPlantilla(): void {
  if (
    !window.confirm(
      '¿Restaurar la plantilla de estilo por defecto? Se perderán los cambios no guardados de la plantilla.'
    )
  ) {
    return
  }
  config.value = {
    ...config.value,
    plantilla: PLANTILLA_PRESENTACION_POR_DEFECTO
  }
  mensaje.value = 'Plantilla restaurada. Guarda para conservar el cambio.'
}

async function copiarHtml(): Promise<void> {
  error.value = null
  mensaje.value = null
  try {
    if ('ClipboardItem' in window) {
      const datos = new ClipboardItem({
        'text/html': new Blob([html.value], { type: 'text/html' }),
        'text/plain': new Blob([html.value], { type: 'text/plain' })
      })
      await navigator.clipboard.write([datos])
    } else {
      await navigator.clipboard.writeText(html.value)
    }
    mensaje.value = 'HTML copiado al portapapeles. Puedes pegarlo en Aules o en un editor.'
  } catch {
    try {
      await navigator.clipboard.writeText(html.value)
      mensaje.value =
        'HTML copiado como texto. Si el destino admite HTML enriquecido, usa un navegador compatible.'
    } catch (e) {
      error.value = (e as Error).message ?? String(e)
    }
  }
}

function descargarHtml(): void {
  const blob = new Blob([documentoHtml.value], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `presentacion-${props.grupo.modulo_siglas.toLowerCase()}.html`
  enlace.click()
  URL.revokeObjectURL(url)
  mensaje.value = 'Presentación descargada en HTML.'
}

function imprimir(): void {
  const ventana = window.open('', '_blank', 'width=1120,height=860')
  if (!ventana) {
    error.value = 'El navegador ha bloqueado la ventana de impresión.'
    return
  }
  ventana.document.open()
  ventana.document.write(documentoHtml.value)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => ventana.print(), 300)
}

onMounted(cargar)
</script>

<template>
  <section class="presentacion">
    <header class="seccion__cabecera">
      <div>
        <h3>Presentación del módulo</h3>
        <p class="tenue">
          Genera una presentación con las unidades, los criterios y el calendario del grupo. Puedes
          copiar el HTML, descargarlo o imprimirlo.
        </p>
      </div>
      <button class="boton boton--sutil" type="button" @click="restaurarPlantilla">
        Restaurar plantilla
      </button>
    </header>

    <div v-if="cargando" class="vacio">Cargando presentación…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else>
      <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

      <section class="tarjeta presentacion__datos">
        <div class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Datos de la presentación</h3>
            <span class="tenue">
              Se guardan junto con la plantilla y se aplican a cualquier módulo.
            </span>
          </div>
        </div>

        <div class="formulario">
          <div class="campo campo--ancho">
            <label for="presentacion-titulo">Título</label>
            <input
              id="presentacion-titulo"
              v-model="config.titulo"
              placeholder="Si se deja vacío, se genera con el nombre del módulo"
            />
          </div>
          <div class="campo campo--ancho">
            <label for="presentacion-subtitulo">Introducción</label>
            <textarea
              id="presentacion-subtitulo"
              v-model="config.subtitulo"
              rows="3"
              placeholder="Texto de bienvenida"
            ></textarea>
          </div>
          <div class="campo">
            <label for="presentacion-profesor">Profesor/a</label>
            <input id="presentacion-profesor" v-model="config.profesor" />
          </div>
          <div class="campo">
            <label for="presentacion-contacto">Correo de contacto</label>
            <input id="presentacion-contacto" v-model="config.contacto" type="email" />
          </div>
          <div class="campo">
            <label for="presentacion-web">Web de apuntes</label>
            <input id="presentacion-web" v-model="config.webApuntes" type="url" />
          </div>
          <div class="campo">
            <label for="presentacion-tutorias">Tutorías</label>
            <input id="presentacion-tutorias" v-model="config.tutorias" />
          </div>
          <div class="campo campo--ancho">
            <label for="presentacion-cierre">Cierre</label>
            <input id="presentacion-cierre" v-model="config.cierre" />
          </div>
        </div>
      </section>

      <details class="tarjeta presentacion__editor">
        <summary>
          <span>Plantilla de estilo</span>
          <span class="tenue"
            >HTML con marcadores. Si la cambias, la vista previa se actualiza.</span
          >
        </summary>
        <div class="presentacion__marcadores">
          <span class="tenue">Marcadores:</span>
          <code
            v-for="marcador in [
              'titulo',
              'subtitulo',
              'profesor',
              'contacto',
              'webApuntes',
              'tutorias',
              'cierre',
              'modulo',
              'curso',
              'modalidad',
              'totalUnidades',
              'totalRas',
              'totalCes',
              'trimestres',
              'unidades',
              'examenes',
              'pesos',
              'requisitos'
            ]"
            :key="marcador"
            >{{ marcador }}</code
          >
        </div>
        <p class="tenue presentacion__ayuda">
          Usa <code v-pre>{{ campo }}</code> para un valor,
          <code v-pre>{{#lista}}…{{/lista}}</code> para repetir y
          <code v-pre>{{^lista}}…{{/lista}}</code> para el caso vacío. Para insertar HTML sin
          escapar, usa <code v-pre>{{{campo}}}</code>.
        </p>
        <textarea
          v-model="config.plantilla"
          class="monospace presentacion__plantilla"
          rows="24"
          spellcheck="false"
          aria-label="Plantilla HTML de la presentación"
        ></textarea>
      </details>

      <div class="barra">
        <button class="boton boton--principal" type="button" :disabled="guardando" @click="guardar">
          {{ guardando ? 'Guardando…' : 'Guardar plantilla' }}
        </button>
        <button class="boton" type="button" @click="copiarHtml">Copiar HTML</button>
        <button class="boton" type="button" @click="descargarHtml">Descargar HTML</button>
        <button class="boton" type="button" @click="imprimir">Imprimir / PDF</button>
        <span class="barra__espacio"></span>
        <span class="tenue">
          {{ unidades.length }} unidades · {{ eventos.length }} fechas ·
          {{ datosPresentacion.totalCes }} CE
        </span>
      </div>

      <div class="presentacion__preview">
        <iframe :srcdoc="documentoHtml" title="Vista previa de la presentación del módulo"></iframe>
      </div>
    </template>
  </section>
</template>

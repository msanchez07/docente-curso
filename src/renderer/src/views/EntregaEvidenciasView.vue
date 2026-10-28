<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import type { CategoriaEvidencia, EntregaClase, EvidenciaClase, GrupoClase } from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import { CATEGORIAS_EVIDENCIA, etiquetaCategoriaEvidencia } from '@shared/evidencias'
import {
  abrirArchivo,
  descargarArchivo,
  leerArchivoDeFichero,
  type ArchivoLeido,
  MAX_ARCHIVO_BYTES,
  tamanoLegible
} from '@renderer/utils/archivos'

const route = useRoute()
const store = useGruposClaseStore()

const grupo = ref<GrupoClase | null>(null)
const entrega = ref<EntregaClase | null>(null)
const evidencias = ref<EvidenciaClase[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const errorAccion = ref<string | null>(null)
const mensaje = ref<string | null>(null)

const ficheroInput = ref<HTMLInputElement | null>(null)
const seleccionados = ref<ArchivoLeido[]>([])
const categoria = ref<CategoriaEvidencia>('material')
const subiendo = ref(false)

const archivoABorrar = ref<EvidenciaClase | null>(null)
const borrando = ref(false)

const grupoId = computed(() => Number(route.params.grupoId))
const entregaId = computed(() => Number(route.params.entregaId))
const bloqueada = computed(() => entrega.value?.bloqueada === true)

async function cargarEvidencias(): Promise<void> {
  if (!grupo.value || !entrega.value) return
  evidencias.value = await window.api.evidenciasClase.listar(grupo.value.id, entrega.value.id)
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar()
    grupo.value = store.grupo(grupoId.value)
    if (!grupo.value) {
      error.value = 'No se ha encontrado el grupo.'
      return
    }
    const entregas = await window.api.entregasClase.listar(grupo.value.id)
    entrega.value = entregas.find((item) => item.id === entregaId.value) ?? null
    if (!entrega.value) {
      error.value = 'No se ha encontrado la entrega.'
      return
    }
    await cargarEvidencias()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch([grupoId, entregaId], cargar)

async function alElegirArchivos(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const ficheros = Array.from(input.files ?? [])
  input.value = ''
  errorAccion.value = null
  mensaje.value = null
  for (const fichero of ficheros) {
    try {
      seleccionados.value.push(await leerArchivoDeFichero(fichero, MAX_ARCHIVO_BYTES))
    } catch (e) {
      errorAccion.value = (e as Error).message ?? String(e)
    }
  }
}

function quitarSeleccionado(indice: number): void {
  seleccionados.value = seleccionados.value.filter((_, posicion) => posicion !== indice)
}

async function subir(): Promise<void> {
  if (!grupo.value || !entrega.value || seleccionados.value.length === 0) return
  subiendo.value = true
  errorAccion.value = null
  mensaje.value = null
  try {
    await window.api.evidenciasClase.subir(
      grupo.value.id,
      entrega.value.id,
      seleccionados.value.map((archivo) => ({
        categoria: categoria.value,
        nombre: archivo.nombre,
        tipo: archivo.tipo,
        tamano: archivo.tamano,
        datos: archivo.datos
      }))
    )
    const cantidad = seleccionados.value.length
    seleccionados.value = []
    mensaje.value = `${cantidad} ${cantidad === 1 ? 'archivo subido' : 'archivos subidos'}.`
    await cargarEvidencias()
    entrega.value =
      (await window.api.entregasClase.listar(grupo.value.id)).find(
        (item) => item.id === entregaId.value
      ) ?? entrega.value
  } catch (e) {
    errorAccion.value = (e as Error).message ?? String(e)
  } finally {
    subiendo.value = false
  }
}

async function borrar(): Promise<void> {
  if (!archivoABorrar.value) return
  borrando.value = true
  errorAccion.value = null
  mensaje.value = null
  try {
    await window.api.evidenciasClase.borrar(archivoABorrar.value.id)
    mensaje.value = 'Archivo borrado.'
    archivoABorrar.value = null
    await cargarEvidencias()
    if (grupo.value) {
      entrega.value =
        (await window.api.entregasClase.listar(grupo.value.id)).find(
          (item) => item.id === entregaId.value
        ) ?? entrega.value
    }
  } catch (e) {
    errorAccion.value = (e as Error).message ?? String(e)
  } finally {
    borrando.value = false
  }
}

function fechaCorta(fecha: string): string {
  const [dia, hora] = fecha.split(' ')
  const [anio, mes, diaMes] = dia.split('-')
  return `${diaMes}/${mes}/${anio} ${hora?.slice(0, 5) ?? ''}`.trim()
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver
      :a="grupo ? { name: 'entrega-notas', params: { grupoId: grupo.id, entregaId } } : '/grupos'"
    />

    <div v-if="cargando && !entrega" class="vacio">Cargando evidencias…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="entrega && grupo">
      <header class="entrega-notas__cabecera">
        <div>
          <h2>Evidencias · {{ entrega.titulo }}</h2>
          <p class="tenue">
            Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }} · documentos y ficheros de
            la entrega
          </p>
        </div>
        <div class="entrega-notas__chips">
          <span v-if="bloqueada" class="chip chip--aviso">bloqueada</span>
          <span class="chip">{{ evidencias.length }} archivos</span>
        </div>
      </header>

      <p v-if="bloqueada" class="aviso aviso--aviso" role="status">
        La entrega está bloqueada. Puedes abrir y descargar sus evidencias, pero no subir ni borrar
        archivos hasta desbloquearla.
      </p>
      <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>
      <p v-if="errorAccion" class="aviso aviso--error" role="alert">{{ errorAccion }}</p>

      <div class="tarjeta">
        <div class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Subir archivos</h3>
            <span class="tenue">
              PDFs, imágenes, documentos… máximo 4 MB por archivo.
              {{ CATEGORIAS_EVIDENCIA.find((opcion) => opcion.id === categoria)?.descripcion }}
            </span>
          </div>
          <div class="cabecera-criterios__acciones evidencias__acciones-subida">
            <label class="evidencias__tipo">
              <span class="tenue">Se adjunta como</span>
              <select v-model="categoria" :disabled="subiendo || bloqueada">
                <option v-for="opcion in CATEGORIAS_EVIDENCIA" :key="opcion.id" :value="opcion.id">
                  {{ opcion.etiqueta }}
                </option>
              </select>
            </label>
            <button
              class="boton"
              type="button"
              :disabled="subiendo || bloqueada"
              @click="ficheroInput?.click()"
            >
              Seleccionar archivos…
            </button>
            <input
              ref="ficheroInput"
              class="visualmente-oculto"
              type="file"
              multiple
              @change="alElegirArchivos"
            />
            <button
              class="boton boton--principal"
              type="button"
              :disabled="subiendo || bloqueada || seleccionados.length === 0"
              @click="subir"
            >
              {{
                subiendo
                  ? 'Subiendo…'
                  : seleccionados.length > 0
                    ? `Subir ${seleccionados.length} ${
                        seleccionados.length === 1 ? 'archivo' : 'archivos'
                      }`
                    : 'Subir archivos'
              }}
            </button>
          </div>
        </div>

        <div v-if="seleccionados.length === 0" class="tenue">
          Todavía no has seleccionado archivos.
        </div>
        <ul v-else class="evidencias__seleccion">
          <li v-for="(archivo, indice) in seleccionados" :key="`${archivo.nombre}-${indice}`">
            <span class="chip" :class="`chip--${categoria}`">
              {{ etiquetaCategoriaEvidencia(categoria) }}
            </span>
            <span class="monospace">{{ archivo.nombre }}</span>
            <span class="tenue">{{ tamanoLegible(archivo.tamano) }}</span>
            <button
              class="boton boton--sutil"
              type="button"
              :disabled="subiendo"
              @click="quitarSeleccionado(indice)"
            >
              Quitar
            </button>
          </li>
        </ul>
      </div>

      <div class="tarjeta">
        <div class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Archivos de la entrega</h3>
            <span class="tenue">Evidencias globales, disponibles para todo el grupo.</span>
          </div>
        </div>

        <div v-if="evidencias.length === 0" class="vacio">
          Esta entrega todavía no tiene evidencias.
        </div>

        <div v-else class="tabla-scroll">
          <table class="tabla evidencias__tabla">
            <thead>
              <tr>
                <th>Evidencia</th>
                <th>Formato</th>
                <th class="num">Tamaño</th>
                <th>Subido</th>
                <th class="acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="evidencia in evidencias" :key="evidencia.id">
                <td>
                  <span class="chip" :class="`chip--${evidencia.categoria}`">
                    {{ etiquetaCategoriaEvidencia(evidencia.categoria) }}
                  </span>
                  <span class="grupo__nombre">{{ evidencia.nombre }}</span>
                </td>
                <td>{{ evidencia.tipo || 'archivo' }}</td>
                <td class="num">{{ tamanoLegible(evidencia.tamano) }}</td>
                <td>{{ fechaCorta(evidencia.creado_en) }}</td>
                <td class="acciones">
                  <button class="boton boton--sutil" type="button" @click="abrirArchivo(evidencia)">
                    Abrir
                  </button>
                  <button
                    class="boton boton--sutil"
                    type="button"
                    @click="descargarArchivo(evidencia)"
                  >
                    Descargar
                  </button>
                  <button
                    class="icono-accion icono-accion--peligro"
                    type="button"
                    :disabled="bloqueada"
                    aria-label="Borrar evidencia"
                    data-tooltip="Borrar evidencia"
                    @click="archivoABorrar = evidencia"
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
      </div>

      <Confirmacion
        v-if="archivoABorrar"
        titulo="¿Borrar la evidencia?"
        etiqueta-confirmar="Sí, borrar"
        peligro
        :ocupado="borrando"
        @cancelar="archivoABorrar = null"
        @confirmar="borrar"
      >
        <p>
          Se va a borrar <strong>{{ archivoABorrar.nombre }}</strong
          >.
        </p>
      </Confirmacion>
    </template>
  </section>
</template>

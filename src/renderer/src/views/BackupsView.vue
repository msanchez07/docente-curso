<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import type { ArchivoBackup, EstadoBackup, GrupoClase, ResultadoBackup } from '@shared/tipos'
import { etiquetaModalidad } from '@shared/grupos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import { notificar } from '@renderer/composables/notificaciones'

const router = useRouter()
const store = useGruposClaseStore()

const estado = ref<EstadoBackup | null>(null)
const archivos = ref<ArchivoBackup[]>([])
const grupos = ref<GrupoClase[]>([])
const cargando = ref(true)
const trabajando = ref(false)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const confirmarImportar = ref(false)
const rutaAImportar = ref<string | null>(null)

const carpetaLista = computed(() => Boolean(estado.value?.configurada && estado.value.existe))

const ultimoPorGrupo = computed(() => {
  const mapa = new Map<number, ArchivoBackup>()
  for (const archivo of archivos.value) {
    if (archivo.grupo_id === null || mapa.has(archivo.grupo_id)) continue
    mapa.set(archivo.grupo_id, archivo)
  }
  return mapa
})

function fecha(iso: string): string {
  if (!iso) return '—'
  const fechaObj = new Date(iso)
  if (Number.isNaN(fechaObj.getTime())) return iso
  return fechaObj.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function tamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function recargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar(true)
    grupos.value = store.grupos
    estado.value = await window.api.backup.estado()
    archivos.value = await window.api.backup.listar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(recargar)

async function elegirCarpeta(): Promise<void> {
  trabajando.value = true
  error.value = null
  mensaje.value = null
  try {
    const nuevo = await window.api.backup.elegirCarpeta()
    if (nuevo) {
      estado.value = nuevo
      archivos.value = await window.api.backup.listar()
      mensaje.value = 'Carpeta de copias actualizada.'
      notificar(mensaje.value)
    }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    trabajando.value = false
  }
}

async function usarRecomendada(): Promise<void> {
  trabajando.value = true
  error.value = null
  mensaje.value = null
  try {
    estado.value = await window.api.backup.usarCarpetaRecomendada()
    archivos.value = await window.api.backup.listar()
    mensaje.value = 'Carpeta recomendada preparada.'
    notificar(mensaje.value)
    window.dispatchEvent(new CustomEvent('backup-configurado'))
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    trabajando.value = false
  }
}

async function abrirCarpeta(): Promise<void> {
  const abierta = await window.api.backup.abrirCarpeta()
  if (!abierta) error.value = 'La carpeta de copias no está disponible.'
}

async function crear(grupo: GrupoClase): Promise<void> {
  trabajando.value = true
  error.value = null
  mensaje.value = null
  try {
    const resultado = await window.api.backup.crear(grupo.id)
    if (!resultado.ok) {
      error.value = resultado.mensaje ?? 'No se pudo crear la copia.'
      return
    }
    mensaje.value = `Copia de «${grupo.nombre}» creada.`
    notificar(mensaje.value)
    await recargar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    trabajando.value = false
  }
}

async function crearTodos(): Promise<void> {
  trabajando.value = true
  error.value = null
  mensaje.value = null
  try {
    const resultados = await window.api.backup.crearTodos()
    const fallos = resultados.filter((resultado) => !resultado.ok)
    mensaje.value =
      fallos.length === 0
        ? `${resultados.length} copias creadas.`
        : `${resultados.length - fallos.length} copias creadas; ${fallos.length} con error.`
    if (fallos.length > 0) error.value = fallos.map((fallo) => fallo.mensaje).join(' · ')
    await recargar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    trabajando.value = false
  }
}

function pedirImportar(ruta: string | null): void {
  rutaAImportar.value = ruta
  confirmarImportar.value = true
}

async function importar(): Promise<void> {
  confirmarImportar.value = false
  trabajando.value = true
  error.value = null
  mensaje.value = null
  try {
    const resultado: ResultadoBackup = await window.api.backup.importar(
      rutaAImportar.value ?? undefined
    )
    if (!resultado.ok) {
      if (resultado.mensaje && resultado.mensaje !== 'Importación cancelada.') {
        error.value = resultado.mensaje
      }
      return
    }
    mensaje.value = resultado.mensaje ?? 'Copia importada.'
    notificar(mensaje.value)
    await recargar()
    if (resultado.grupo_id) {
      await router.push({ name: 'grupo', params: { id: resultado.grupo_id } })
    }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    trabajando.value = false
    rutaAImportar.value = null
  }
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver a="/grupos" />

    <header class="vista__cabecera">
      <h2>Copias de seguridad</h2>
      <p class="tenue">
        Cada grupo se guarda en un JSON autocontenido dentro de la subcarpeta de su curso. Incluye
        alumnado, criterios, entregas, notas, evidencias, programación, unidades y formación.
      </p>
    </header>

    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <div v-if="cargando" class="vacio">Cargando copias de seguridad…</div>

    <template v-else>
      <section class="tarjeta backups__carpeta">
        <div class="backups__carpeta-info">
          <span class="campo__etiqueta">Carpeta de copias</span>
          <p class="backups__ruta monospace">{{ estado?.carpeta ?? 'Sin configurar' }}</p>
          <p class="tenue">
            {{
              !estado?.configurada
                ? 'Todavía no has indicado la carpeta. Elige una para activar las copias.'
                : estado.existe
                  ? `Carpeta disponible · ${estado.backups} copias encontradas`
                  : 'La carpeta configurada ya no existe. Elige otra o vuelve a crearla.'
            }}
          </p>
        </div>
        <div class="backups__carpeta-acciones">
          <button class="boton" type="button" :disabled="trabajando" @click="elegirCarpeta">
            Elegir carpeta
          </button>
          <button
            class="boton boton--sutil"
            type="button"
            :disabled="trabajando"
            @click="usarRecomendada"
          >
            Usar carpeta recomendada
          </button>
          <button
            class="boton boton--sutil"
            type="button"
            :disabled="!estado?.existe"
            @click="abrirCarpeta"
          >
            Abrir carpeta
          </button>
        </div>
      </section>

      <p v-if="estado?.mensaje" class="aviso aviso--aviso">{{ estado.mensaje }}</p>

      <section class="tarjeta">
        <header class="dashboard__tarjeta-cabecera">
          <div>
            <h3>Grupos</h3>
            <p class="tenue">Crea una copia manual o copia todos los grupos de golpe.</p>
          </div>
          <button
            class="boton boton--principal"
            type="button"
            :disabled="trabajando || !carpetaLista || grupos.length === 0"
            @click="crearTodos"
          >
            {{ trabajando ? 'Trabajando…' : 'Copiar todos' }}
          </button>
        </header>

        <p v-if="grupos.length === 0" class="tenue">No hay grupos de clase todavía.</p>
        <div v-else class="tabla-scroll">
          <table class="tabla">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Curso</th>
                <th>Modalidad</th>
                <th>Última copia</th>
                <th class="acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="grupo in grupos" :key="grupo.id">
                <td>
                  <strong>{{ grupo.nombre }}</strong>
                </td>
                <td>{{ grupo.curso_academico_nombre }}</td>
                <td>{{ etiquetaModalidad(grupo.modalidad) }}</td>
                <td class="tenue">
                  {{
                    ultimoPorGrupo.get(grupo.id)
                      ? fecha(ultimoPorGrupo.get(grupo.id)!.generado_en)
                      : 'Sin copias'
                  }}
                </td>
                <td class="acciones">
                  <button
                    class="boton boton--sutil"
                    type="button"
                    :disabled="trabajando || !carpetaLista"
                    @click="crear(grupo)"
                  >
                    Copia ahora
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="tarjeta">
        <header class="dashboard__tarjeta-cabecera">
          <div>
            <h3>Copias disponibles</h3>
            <p class="tenue">Puedes importar una copia para restaurar solo ese grupo.</p>
          </div>
          <button class="boton" type="button" :disabled="trabajando" @click="pedirImportar(null)">
            Importar copia
          </button>
        </header>

        <p v-if="archivos.length === 0" class="tenue">
          No hay copias en la carpeta. Crea la primera desde la tabla de grupos.
        </p>
        <div v-else class="tabla-scroll">
          <table class="tabla">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Curso</th>
                <th>Fecha</th>
                <th>Tamaño</th>
                <th class="acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="archivo in archivos" :key="archivo.ruta">
                <td>
                  <strong>{{ archivo.grupo_nombre }}</strong>
                  <span class="tenue backups__archivo">{{ archivo.archivo }}</span>
                </td>
                <td>{{ archivo.curso }}</td>
                <td>{{ fecha(archivo.generado_en) }}</td>
                <td class="tenue">{{ tamano(archivo.tamano) }}</td>
                <td class="acciones">
                  <button
                    class="boton boton--sutil"
                    type="button"
                    :disabled="trabajando"
                    @click="pedirImportar(null)"
                  >
                    Restaurar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <Confirmacion
      v-if="confirmarImportar"
      titulo="¿Importar una copia de seguridad?"
      etiqueta-confirmar="Sí, importar"
      :ocupado="trabajando"
      @cancelar="confirmarImportar = false"
      @confirmar="importar"
    >
      <p v-if="rutaAImportar" class="monospace backups__archivo">{{ rutaAImportar }}</p>
      <p>
        Se restaurará únicamente el grupo contenido en la copia. Si ya existe un grupo con el mismo
        curso, ciclo, nivel, modalidad y módulo, se sustituirá su contenido.
      </p>
      <p class="tenue">Después se abrirá el dashboard del grupo restaurado.</p>
    </Confirmacion>
  </section>
</template>

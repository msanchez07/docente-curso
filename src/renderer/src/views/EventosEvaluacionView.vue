<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import MenuAcciones, { type AccionMenu } from '@renderer/components/MenuAcciones.vue'
import SelectButton from '@renderer/components/SelectButton.vue'
import { ESQUEMA_EVENTOS } from '@shared/esquemas-importacion'
import { descargarJson } from '@renderer/utils/descargar-json'
import type {
  EventoEvaluacionClase,
  EventoEvaluacionEntrada,
  GrupoClase,
  ModeloEvaluacion
} from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

withDefaults(defineProps<{ embebido?: boolean }>(), { embebido: false })

const route = useRoute()
const store = useGruposClaseStore()

const grupo = ref<GrupoClase | null>(null)
const criterios = ref<ModeloEvaluacion | null>(null)
const eventos = ref<EventoEvaluacionClase[]>([])
const cargando = ref(true)
const guardando = ref(false)
const error = ref<string | null>(null)
const errorFormulario = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const editando = ref<EventoEvaluacionClase | null>(null)
const eventoABorrar = ref<EventoEvaluacionClase | null>(null)
const borrando = ref(false)
const mostrarImportar = ref(false)
const textoImportar = ref('')
const ficheroImportar = ref<HTMLInputElement | null>(null)
const errorImportar = ref<string | null>(null)
const importando = ref(false)

const form = reactive<EventoEvaluacionEntrada>({
  tipo: 'evaluacion',
  titulo: '',
  fecha: '',
  hora: '',
  avaluacion_id: '',
  observaciones: ''
})

const grupoId = computed(() => Number(route.params.grupoId))
const hoy = new Date().toISOString().slice(0, 10)
const opcionesTipo = [
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'examen', label: 'Examen' }
]

const proximo = computed(() => eventos.value.find((evento) => evento.fecha >= hoy) ?? null)
const totalEvaluaciones = computed(
  () => eventos.value.filter((evento) => evento.tipo === 'evaluacion').length
)
const totalExamenes = computed(
  () => eventos.value.filter((evento) => evento.tipo === 'examen').length
)

function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function etiquetaTipo(tipo: string): string {
  return tipo === 'evaluacion' ? 'Evaluación' : 'Examen'
}

function nombreAvaluacion(id: string | null): string {
  if (!id) return '—'
  return criterios.value?.avaluaciones.find((avaluacion) => avaluacion.id === id)?.nombre ?? id
}

function accionesEvento(): AccionMenu[] {
  return [
    { id: 'editar', etiqueta: 'Editar fecha', icono: 'editar' },
    { id: 'borrar', etiqueta: 'Borrar fecha', icono: 'borrar', peligro: true }
  ]
}

function ejecutarAccionEvento(evento: EventoEvaluacionClase, accion: string): void {
  if (accion === 'editar') editar(evento)
  else if (accion === 'borrar') eventoABorrar.value = evento
}

function resetFormulario(): void {
  editando.value = null
  Object.assign(form, {
    tipo: 'evaluacion',
    titulo: '',
    fecha: hoy,
    hora: '',
    avaluacion_id: '',
    observaciones: ''
  })
  errorFormulario.value = null
}

function editar(evento: EventoEvaluacionClase): void {
  editando.value = evento
  Object.assign(form, {
    tipo: evento.tipo,
    titulo: evento.titulo,
    fecha: evento.fecha,
    hora: evento.hora ?? '',
    avaluacion_id: evento.avaluacion_id ?? '',
    observaciones: evento.observaciones ?? ''
  })
  errorFormulario.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
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
    const [modelo, lista] = await Promise.all([
      window.api.criterios.obtener(grupo.value.id),
      window.api.eventosEvaluacion.listar(grupo.value.id)
    ])
    criterios.value = modelo
    eventos.value = lista
    resetFormulario()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(grupoId, cargar)

async function guardar(): Promise<void> {
  if (!grupo.value) return
  errorFormulario.value = null
  guardando.value = true
  try {
    if (editando.value) {
      await window.api.eventosEvaluacion.actualizar(editando.value.id, { ...form })
      mensaje.value = 'Fecha actualizada.'
    } else {
      await window.api.eventosEvaluacion.crear(grupo.value.id, { ...form })
      mensaje.value = 'Fecha añadida.'
    }
    eventos.value = await window.api.eventosEvaluacion.listar(grupo.value.id)
    resetFormulario()
  } catch (e) {
    errorFormulario.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function borrar(): Promise<void> {
  if (!eventoABorrar.value || !grupo.value) return
  borrando.value = true
  try {
    await window.api.eventosEvaluacion.borrar(eventoABorrar.value.id)
    eventos.value = await window.api.eventosEvaluacion.listar(grupo.value.id)
    eventoABorrar.value = null
    mensaje.value = 'Fecha borrada.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    borrando.value = false
  }
}

function accionesCabecera(): AccionMenu[] {
  return [
    { id: 'importar', etiqueta: 'Importar fechas', icono: 'importar' },
    { id: 'esquema', etiqueta: 'Descargar esquema', icono: 'descargar' }
  ]
}

function ejecutarAccionCabecera(accion: string): void {
  if (accion === 'importar') abrirImportar()
  else if (accion === 'esquema') exportarEsquema()
}

function abrirImportar(): void {
  mostrarImportar.value = true
  textoImportar.value = ''
  errorImportar.value = null
  mensaje.value = null
}

function exportarEsquema(): void {
  descargarJson('esquema-eventos-evaluacion.json', ESQUEMA_EVENTOS)
}

async function importarTexto(texto: string): Promise<void> {
  if (!grupo.value || !texto.trim()) return
  importando.value = true
  errorImportar.value = null
  try {
    const resultado = await window.api.eventosEvaluacion.importar(grupo.value.id, texto)
    eventos.value = await window.api.eventosEvaluacion.listar(grupo.value.id)
    mensaje.value = `${resultado.creados} fecha(s) importada(s).`
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
    <header v-if="!embebido" class="vista__cabecera">
      <h2>Evaluaciones y exámenes</h2>
      <p v-if="grupo" class="tenue">
        Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }}
      </p>
    </header>
    <header v-else class="seccion__cabecera">
      <div>
        <h3>Evaluaciones y exámenes</h3>
        <p class="tenue">Fechas clave del grupo ordenadas por día.</p>
      </div>
    </header>

    <div v-if="cargando" class="vacio">Cargando fechas…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="grupo">
      <section class="formacion__resumen">
        <div class="tarjeta">
          <span class="tenue">Próxima fecha</span>
          <strong>
            {{ proximo ? fechaCorta(proximo.fecha) : '—' }}
          </strong>
          <small class="tenue">{{ proximo?.titulo ?? 'Sin fechas próximas' }}</small>
        </div>
        <div class="tarjeta">
          <span class="tenue">Evaluaciones</span>
          <strong>{{ totalEvaluaciones }}</strong>
        </div>
        <div class="tarjeta">
          <span class="tenue">Exámenes</span>
          <strong>{{ totalExamenes }}</strong>
        </div>
      </section>

      <div class="barra">
        <MenuAcciones
          texto="Acciones"
          :acciones="accionesCabecera()"
          @accion="ejecutarAccionCabecera"
        />
        <span class="barra__espacio"></span>
        <span class="tenue">{{ eventos.length }} fechas registradas</span>
      </div>

      <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

      <div v-if="mostrarImportar" class="tarjeta programacion__importar">
        <div class="entrega-form__seccion-cabecera">
          <div>
            <h3>Importar fechas</h3>
            <p class="tenue">
              Acepta un array de objetos o
              <span class="monospace">{ "eventos": [...] }</span>. Campos: tipo (evaluacion/examen),
              titulo, fecha, hora, avaluacion y observaciones.
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
            accept=".json,application/json"
            @change="alElegirFichero"
          />
          <span class="tenue">o pega el JSON abajo</span>
        </div>
        <textarea
          v-model="textoImportar"
          rows="7"
          class="monospace"
          placeholder='{
  "eventos": [
    { "tipo": "examen", "titulo": "Examen AV1", "fecha": "19/11/2026", "hora": "09:00", "avaluacion": "AV1" },
    { "tipo": "evaluacion", "titulo": "Sesión 1ª evaluación", "fecha": "10/12/2026", "avaluacion": "AV1" }
  ]
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

      <div class="formacion__layout">
        <section class="tarjeta">
          <header class="entrega-form__seccion-cabecera">
            <div>
              <h3>Calendario</h3>
              <p class="tenue">Evaluaciones y exámenes ordenados por fecha.</p>
            </div>
          </header>

          <div v-if="eventos.length === 0" class="vacio">
            Todavía no hay fechas registradas. Añade una o importa un JSON.
          </div>

          <div v-else class="tabla-scroll">
            <table class="tabla tabla--compacta">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Título</th>
                  <th>Avaluación</th>
                  <th>Hora</th>
                  <th>Observaciones</th>
                  <th class="acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="evento in eventos" :key="evento.id">
                  <td>{{ fechaCorta(evento.fecha) }}</td>
                  <td>
                    <span
                      class="chip"
                      :class="evento.tipo === 'examen' ? 'chip--aviso' : 'chip--ok'"
                    >
                      {{ etiquetaTipo(evento.tipo) }}
                    </span>
                  </td>
                  <td>
                    <strong>{{ evento.titulo }}</strong>
                  </td>
                  <td>{{ nombreAvaluacion(evento.avaluacion_id) }}</td>
                  <td>{{ evento.hora ?? '—' }}</td>
                  <td class="tenue">{{ evento.observaciones ?? '—' }}</td>
                  <td class="acciones">
                    <MenuAcciones
                      :acciones="accionesEvento()"
                      @accion="ejecutarAccionEvento(evento, $event)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <aside class="tarjeta formacion__formulario">
          <header class="entrega-form__seccion-cabecera">
            <div>
              <h3>{{ editando ? 'Editar fecha' : 'Añadir fecha' }}</h3>
              <p class="tenue">Evaluación o examen del grupo.</p>
            </div>
            <span v-if="editando" class="chip chip--aviso">editando</span>
          </header>

          <p v-if="errorFormulario" class="aviso aviso--error" role="alert">
            {{ errorFormulario }}
          </p>

          <form class="formulario" @submit.prevent="guardar">
            <div class="campo campo--ancho">
              <span class="campo__etiqueta">Tipo *</span>
              <SelectButton
                v-model="form.tipo"
                :opciones="opcionesTipo"
                aria-label="Tipo de fecha"
              />
            </div>
            <div class="campo campo--ancho">
              <label for="evento-titulo">Título *</label>
              <input
                id="evento-titulo"
                v-model="form.titulo"
                placeholder="Examen AV1 / Sesión de evaluación"
                required
              />
            </div>
            <div class="campo">
              <label for="evento-fecha">Fecha *</label>
              <input id="evento-fecha" v-model="form.fecha" type="date" required />
            </div>
            <div class="campo">
              <label for="evento-hora">Hora</label>
              <input id="evento-hora" v-model="form.hora" type="time" />
            </div>
            <div class="campo campo--ancho">
              <label for="evento-avaluacion">Avaluación</label>
              <select id="evento-avaluacion" v-model="form.avaluacion_id">
                <option value="">Sin asignar</option>
                <option
                  v-for="avaluacion in criterios?.avaluaciones ?? []"
                  :key="avaluacion.id"
                  :value="avaluacion.id"
                >
                  {{ avaluacion.nombre }}
                </option>
              </select>
            </div>
            <div class="campo campo--ancho">
              <label for="evento-observaciones">Observaciones</label>
              <textarea
                id="evento-observaciones"
                v-model="form.observaciones"
                rows="3"
                placeholder="Aula, instrucciones, incidencias…"
              ></textarea>
            </div>
            <div class="formacion__acciones">
              <button
                class="boton boton--principal"
                type="submit"
                :disabled="guardando || !form.titulo.trim() || !form.fecha"
              >
                {{ guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Añadir fecha' }}
              </button>
              <button v-if="editando" class="boton" type="button" @click="resetFormulario">
                Cancelar
              </button>
            </div>
          </form>
        </aside>
      </div>

      <Confirmacion
        v-if="eventoABorrar"
        titulo="¿Borrar la fecha?"
        etiqueta-confirmar="Sí, borrar"
        peligro
        :ocupado="borrando"
        @cancelar="eventoABorrar = null"
        @confirmar="borrar"
      >
        <p>
          Se borrará <strong>{{ eventoABorrar.titulo }}</strong> del
          {{ fechaCorta(eventoABorrar.fecha) }}.
        </p>
      </Confirmacion>
    </template>
  </section>
</template>

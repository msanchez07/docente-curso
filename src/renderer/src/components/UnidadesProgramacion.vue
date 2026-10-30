<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import MenuAcciones, { type AccionMenu } from '@renderer/components/MenuAcciones.vue'
import { ESQUEMA_UNIDADES } from '@shared/esquemas-importacion'
import { descargarJson } from '@renderer/utils/descargar-json'
import type {
  CriterioDisponible,
  CriterioUnidad,
  GrupoClase,
  UnidadProgramacion,
  UnidadProgramacionEntrada
} from '@shared/tipos'

const props = defineProps<{ grupo: GrupoClase }>()
const emit = defineEmits<{ actualizado: [] }>()

const unidades = ref<UnidadProgramacion[]>([])
const criterios = ref<CriterioDisponible[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const guardando = ref(false)
const mostrarForm = ref(false)
const editando = ref<UnidadProgramacion | null>(null)
const unidadABorrar = ref<UnidadProgramacion | null>(null)
const borrando = ref(false)
const unidadSeleccionada = ref<number | null>(null)
const mostrarImportar = ref(false)
const textoImportar = ref('')
const ficheroImportar = ref<HTMLInputElement | null>(null)
const errorImportar = ref<string | null>(null)
const importando = ref(false)

const form = reactive<UnidadProgramacionEntrada>({
  codigo: '',
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  contenidos: '',
  observaciones: '',
  criterios: []
})

const raActiva = ref<string | null>(null)

const unidadActual = computed(
  () =>
    unidades.value.find((unidad) => unidad.id === unidadSeleccionada.value) ??
    unidades.value[0] ??
    null
)

watch(
  unidades,
  (lista) => {
    if (lista.length === 0) {
      unidadSeleccionada.value = null
      return
    }
    if (!lista.some((unidad) => unidad.id === unidadSeleccionada.value)) {
      unidadSeleccionada.value = lista[0].id
    }
  },
  { immediate: true }
)

const rasConCriterios = computed(() => {
  const mapa = new Map<
    string,
    { codigo: string; descripcion: string; criterios: CriterioDisponible[] }
  >()
  for (const criterio of criterios.value) {
    const grupo = mapa.get(criterio.raCodigo) ?? {
      codigo: criterio.raCodigo,
      descripcion: criterio.raDescripcion,
      criterios: []
    }
    grupo.criterios.push(criterio)
    mapa.set(criterio.raCodigo, grupo)
  }
  return [...mapa.values()]
})

const raActual = computed(
  () =>
    rasConCriterios.value.find((ra) => ra.codigo === raActiva.value) ??
    rasConCriterios.value[0] ??
    null
)

watch(rasConCriterios, (ras) => {
  if (!raActiva.value || !ras.some((ra) => ra.codigo === raActiva.value)) {
    raActiva.value = ras[0]?.codigo ?? null
  }
})

function fechaCorta(fecha: string | null): string {
  if (!fecha) return '—'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function rango(unidad: UnidadProgramacion): string {
  if (!unidad.fecha_inicio && !unidad.fecha_fin) return 'Sin fechas'
  return `${fechaCorta(unidad.fecha_inicio)} — ${fechaCorta(unidad.fecha_fin)}`
}

function acciones(): AccionMenu[] {
  return [
    { id: 'editar', etiqueta: 'Editar unidad', icono: 'editar' },
    { id: 'borrar', etiqueta: 'Borrar unidad', icono: 'borrar', peligro: true }
  ]
}

function ejecutarAccion(unidad: UnidadProgramacion, accion: string): void {
  if (accion === 'editar') editar(unidad)
  else if (accion === 'borrar') unidadABorrar.value = unidad
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    const [lista, ce] = await Promise.all([
      window.api.unidadesProgramacion.listar(props.grupo.id),
      window.api.entregasClase.criterios(props.grupo.id)
    ])
    unidades.value = lista
    criterios.value = ce
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

function resetFormulario(): void {
  editando.value = null
  form.codigo = ''
  form.nombre = ''
  form.fecha_inicio = ''
  form.fecha_fin = ''
  form.contenidos = ''
  form.observaciones = ''
  form.criterios = []
  raActiva.value = rasConCriterios.value[0]?.codigo ?? null
  error.value = null
}

function abrirImportar(): void {
  mostrarImportar.value = true
  textoImportar.value = ''
  errorImportar.value = null
  mensaje.value = null
}

function exportarEsquema(): void {
  descargarJson('esquema-unidades-programacion.json', ESQUEMA_UNIDADES)
}

async function importarTexto(texto: string): Promise<void> {
  if (!texto.trim()) return
  importando.value = true
  errorImportar.value = null
  try {
    const resultado = await window.api.unidadesProgramacion.importar(props.grupo.id, texto)
    await cargar()
    emit('actualizado')
    mensaje.value = `${resultado.creados} unidad(es) importada(s).`
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

function nueva(): void {
  resetFormulario()
  mostrarForm.value = true
  mensaje.value = null
}

function editar(unidad: UnidadProgramacion): void {
  editando.value = unidad
  form.codigo = unidad.codigo ?? ''
  form.nombre = unidad.nombre
  form.fecha_inicio = unidad.fecha_inicio ?? ''
  form.fecha_fin = unidad.fecha_fin ?? ''
  form.contenidos = unidad.contenidos
  form.observaciones = unidad.observaciones ?? ''
  form.criterios = unidad.criterios.map((criterio) => ({ ...criterio }))
  raActiva.value = unidad.criterios[0]?.raCodigo ?? rasConCriterios.value[0]?.codigo ?? null
  mostrarForm.value = true
  error.value = null
  mensaje.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function claveCriterio(criterio: CriterioUnidad): string {
  return `${criterio.raCodigo}|${criterio.ceCodigo}`
}

function criteriosPorRa(criterios: CriterioUnidad[]): { raCodigo: string; ceCodigos: string[] }[] {
  const mapa = new Map<string, string[]>()
  for (const criterio of criterios) {
    const lista = mapa.get(criterio.raCodigo) ?? []
    lista.push(criterio.ceCodigo)
    mapa.set(criterio.raCodigo, lista)
  }
  return [...mapa.entries()].map(([raCodigo, ceCodigos]) => ({ raCodigo, ceCodigos }))
}

function criterioSeleccionado(criterio: CriterioDisponible): boolean {
  return (form.criterios ?? []).some(
    (item) => item.raCodigo === criterio.raCodigo && item.ceCodigo === criterio.ceCodigo
  )
}

function seleccionadosRa(ra: { criterios: CriterioDisponible[] }): number {
  return ra.criterios.filter((criterio) => criterioSeleccionado(criterio)).length
}

function todosRa(ra: { criterios: CriterioDisponible[] }): boolean {
  return ra.criterios.length > 0 && seleccionadosRa(ra) === ra.criterios.length
}

function alternarCriterio(criterio: CriterioDisponible): void {
  const actuales = form.criterios ?? []
  form.criterios = criterioSeleccionado(criterio)
    ? actuales.filter((item) => claveCriterio(item) !== claveCriterio(criterio))
    : [...actuales, { raCodigo: criterio.raCodigo, ceCodigo: criterio.ceCodigo }]
}

function alternarRa(ra: { criterios: CriterioDisponible[] }): void {
  const actuales = form.criterios ?? []
  if (todosRa(ra)) {
    const claves = new Set(ra.criterios.map((criterio) => claveCriterio(criterio)))
    form.criterios = actuales.filter((item) => !claves.has(claveCriterio(item)))
    return
  }
  const porClave = new Map(actuales.map((item) => [claveCriterio(item), item]))
  for (const criterio of ra.criterios) {
    porClave.set(claveCriterio(criterio), {
      raCodigo: criterio.raCodigo,
      ceCodigo: criterio.ceCodigo
    })
  }
  form.criterios = [...porClave.values()]
}

async function guardar(): Promise<void> {
  guardando.value = true
  error.value = null
  mensaje.value = null
  try {
    let guardada: UnidadProgramacion
    if (editando.value) {
      guardada = (await window.api.unidadesProgramacion.actualizar(editando.value.id, {
        ...form
      }))!
      mensaje.value = 'Unidad actualizada.'
    } else {
      guardada = await window.api.unidadesProgramacion.crear(props.grupo.id, { ...form })
      mensaje.value = 'Unidad creada.'
    }
    await cargar()
    unidadSeleccionada.value = guardada.id
    emit('actualizado')
    resetFormulario()
    mostrarForm.value = false
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function borrar(): Promise<void> {
  if (!unidadABorrar.value) return
  borrando.value = true
  error.value = null
  try {
    await window.api.unidadesProgramacion.borrar(unidadABorrar.value.id)
    mensaje.value = 'Unidad borrada. Sus sesiones quedan sin asignar.'
    unidadABorrar.value = null
    await cargar()
    emit('actualizado')
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    borrando.value = false
  }
}
</script>

<template>
  <div class="tarjeta unidades">
    <div class="cabecera-criterios">
      <div class="cabecera-criterios__titulo">
        <h3>Unidades de programación</h3>
        <span class="tenue">
          {{ unidades.length }} unidades · sesiones, criterios y contenidos
        </span>
      </div>
      <div class="cabecera-criterios__acciones">
        <button class="boton" type="button" @click="abrirImportar">Importar JSON</button>
        <button class="boton" type="button" @click="exportarEsquema">Descargar esquema</button>
        <button class="boton boton--principal" type="button" @click="nueva">Nueva unidad</button>
      </div>
    </div>

    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

    <section v-if="mostrarImportar" class="tarjeta programacion__importar unidades__importar">
      <header class="entrega-form__seccion-cabecera">
        <div>
          <h3>Importar unidades</h3>
          <p class="tenue">
            Acepta un array o <span class="monospace">{ "unidades": [...] }</span>. Cada unidad
            puede incluir sus sesiones, criterios (RA + CE) y contenidos.
          </p>
        </div>
      </header>
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
        placeholder='[
  {
    "codigo": "UD1",
    "nombre": "Introducción",
    "criterios": [
      { "raCodigo": "RA1", "ceCodigo": "a" },
      { "raCodigo": "RA2", "ceCodigo": "b" }
    ],
    "contenidos": "Entorno, sintaxis y estructuras de control",
    "sesiones": [{ "fecha": "2026-09-16", "contenido": "Presentación" }]
  }
]'
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
    </section>

    <section v-if="mostrarForm" class="tarjeta form-inline unidades__form">
      <header class="entrega-form__seccion-cabecera">
        <div>
          <h3>{{ editando ? 'Editar unidad' : 'Nueva unidad' }}</h3>
          <p class="tenue">Agrupa sesiones, criterios de evaluación y contenidos.</p>
        </div>
        <button class="boton" type="button" @click="mostrarForm = false">Cancelar</button>
      </header>

      <div class="formulario">
        <div class="campo">
          <label for="unidad-codigo">Código</label>
          <input id="unidad-codigo" v-model="form.codigo" placeholder="UD1" />
        </div>
        <div class="campo campo--ancho">
          <label for="unidad-nombre">Nombre *</label>
          <input id="unidad-nombre" v-model="form.nombre" placeholder="Introducción al módulo" />
        </div>
        <div class="campo">
          <label for="unidad-inicio">Inicio</label>
          <input id="unidad-inicio" v-model="form.fecha_inicio" type="date" />
        </div>
        <div class="campo">
          <label for="unidad-fin">Fin</label>
          <input id="unidad-fin" v-model="form.fecha_fin" type="date" />
        </div>
        <div class="campo campo--ancho">
          <span class="campo__etiqueta">
            Criterios de evaluación
            <span class="tenue">· {{ form.criterios?.length ?? 0 }} seleccionados</span>
          </span>
          <div class="unidades__ras">
            <div class="unidades__ra-tabs" role="tablist" aria-label="Resultados de aprendizaje">
              <button
                v-for="ra in rasConCriterios"
                :key="ra.codigo"
                class="unidades__ra-tab"
                :class="{ 'unidades__ra-tab--activa': raActual?.codigo === ra.codigo }"
                type="button"
                role="tab"
                :aria-selected="raActual?.codigo === ra.codigo"
                @click="raActiva = ra.codigo"
              >
                {{ ra.codigo }}
                <small>{{ seleccionadosRa(ra) }}/{{ ra.criterios.length }}</small>
              </button>
            </div>

            <section v-if="raActual" class="unidades__ra-panel">
              <header class="unidades__ra-panel-cabecera">
                <label class="chip unidades__ra">
                  <input
                    type="checkbox"
                    :checked="todosRa(raActual)"
                    @change="alternarRa(raActual)"
                  />
                  {{ raActual.codigo }}
                </label>
                <span class="tenue">{{ raActual.descripcion }}</span>
                <button class="boton boton--sutil" type="button" @click="alternarRa(raActual)">
                  {{ todosRa(raActual) ? 'Quitar todos' : 'Seleccionar todos' }}
                </button>
              </header>
              <div class="unidades__ces">
                <label
                  v-for="criterio in raActual.criterios"
                  :key="criterio.ceCodigo"
                  class="unidades__ce"
                  :class="{ 'unidades__ce--activo': criterioSeleccionado(criterio) }"
                >
                  <input
                    type="checkbox"
                    :checked="criterioSeleccionado(criterio)"
                    @change="alternarCriterio(criterio)"
                  />
                  <span class="unidades__ce-codigo">{{ criterio.ceCodigo }}</span>
                  <span class="unidades__ce-descripcion">{{ criterio.descripcion }}</span>
                </label>
              </div>
            </section>
          </div>
        </div>
        <div class="campo campo--ancho">
          <label for="unidad-contenidos">Contenidos</label>
          <textarea
            id="unidad-contenidos"
            v-model="form.contenidos"
            rows="4"
            placeholder="Contenidos, actividades y criterios de trabajo…"
          ></textarea>
        </div>
        <div class="campo campo--ancho">
          <label for="unidad-observaciones">Observaciones</label>
          <textarea
            id="unidad-observaciones"
            v-model="form.observaciones"
            rows="2"
            placeholder="Notas de organización"
          ></textarea>
        </div>
      </div>

      <div class="criterios__pie-fila">
        <span class="tenue">Las sesiones se asignan desde el formulario de cada día.</span>
        <span class="barra__espacio"></span>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="guardando || !form.nombre.trim()"
          @click="guardar"
        >
          {{ guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear unidad' }}
        </button>
      </div>
    </section>

    <div v-if="cargando" class="vacio">Cargando unidades…</div>
    <div v-else-if="unidades.length === 0" class="vacio">
      Todavía no hay unidades. Crea la primera para agrupar las sesiones, los criterios de
      evaluación y los contenidos.
    </div>
    <div v-else class="unidades__layout">
      <aside class="tarjeta unidades__indice" aria-label="Unidades de programación">
        <header class="unidades__indice-cabecera">
          <h4>Unidades</h4>
          <span class="tenue">{{ unidades.length }}</span>
        </header>
        <button
          v-for="unidad in unidades"
          :key="unidad.id"
          class="unidades__item"
          :class="{ 'unidades__item--activo': unidadActual?.id === unidad.id }"
          type="button"
          @click="unidadSeleccionada = unidad.id"
        >
          <span v-if="unidad.codigo" class="unidades__item-codigo">{{ unidad.codigo }}</span>
          <span class="unidades__item-nombre">{{ unidad.nombre }}</span>
          <span class="unidades__item-fechas">{{ rango(unidad) }}</span>
          <span class="unidades__item-meta">
            {{ unidad.sesiones.length }} sesiones · {{ unidad.ra_codigos.length }} RA ·
            {{ unidad.criterios.length }} CE
          </span>
        </button>
      </aside>

      <section v-if="unidadActual" class="tarjeta unidades__detalle">
        <header class="unidades__detalle-cabecera">
          <div>
            <span v-if="unidadActual.codigo" class="unidades__codigo">
              {{ unidadActual.codigo }}
            </span>
            <h3>{{ unidadActual.nombre }}</h3>
            <p class="tenue">{{ rango(unidadActual) }}</p>
          </div>
          <MenuAcciones :acciones="acciones()" @accion="ejecutarAccion(unidadActual, $event)" />
        </header>

        <div class="unidades__ficha">
          <div>
            <span class="tenue">Sesiones</span>
            <strong>{{ unidadActual.sesiones.length }}</strong>
          </div>
          <div>
            <span class="tenue">Criterios de evaluación</span>
            <div v-if="unidadActual.criterios.length > 0" class="unidades__criterios-resumen">
              <div
                v-for="grupo in criteriosPorRa(unidadActual.criterios)"
                :key="grupo.raCodigo"
                class="unidades__criterios-grupo"
              >
                <span class="chip">{{ grupo.raCodigo }}</span>
                <span class="tenue">{{ grupo.ceCodigos.join(' · ') }}</span>
              </div>
            </div>
            <span v-else class="tenue">Sin criterios</span>
          </div>
          <div>
            <span class="tenue">Fechas</span>
            <strong>{{ rango(unidadActual) }}</strong>
          </div>
        </div>

        <div class="unidades__bloque">
          <h4>Contenidos</h4>
          <p class="unidades__texto">
            {{ unidadActual.contenidos || 'Sin contenidos definidos.' }}
          </p>
        </div>

        <div v-if="unidadActual.observaciones" class="unidades__bloque">
          <h4>Observaciones</h4>
          <p class="unidades__texto">{{ unidadActual.observaciones }}</p>
        </div>

        <div class="unidades__bloque">
          <h4>Sesiones de la unidad</h4>
          <p v-if="unidadActual.sesiones.length === 0" class="tenue">
            Todavía no hay sesiones asignadas. Asígnalas desde el formulario de cada día en la
            programación de aula.
          </p>
          <div v-else class="tabla-scroll unidades__sesiones-tabla">
            <table class="tabla tabla--compacta">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Contenido</th>
                  <th>Desviación</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sesion in unidadActual.sesiones" :key="sesion.id">
                  <td class="monospace">{{ fechaCorta(sesion.fecha) }}</td>
                  <td>{{ sesion.contenido || 'Sin contenido' }}</td>
                  <td class="tenue">{{ sesion.desviacion || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <Confirmacion
      v-if="unidadABorrar"
      titulo="¿Borrar la unidad?"
      etiqueta-confirmar="Sí, borrar"
      peligro
      :ocupado="borrando"
      @cancelar="unidadABorrar = null"
      @confirmar="borrar"
    >
      <p>
        Se borrará <strong>{{ unidadABorrar.nombre }}</strong
        >. Las sesiones asignadas seguirán en la programación, pero quedarán sin unidad.
      </p>
    </Confirmacion>
  </div>
</template>

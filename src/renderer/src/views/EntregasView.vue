<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import MenuAcciones, { type AccionMenu } from '@renderer/components/MenuAcciones.vue'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import type {
  AlumnoClase,
  EntregaClase,
  GrupoClase,
  ModeloEvaluacion,
  OpcionesExportacionEntregas,
  VistaPreviaEntregas
} from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

const route = useRoute()
const router = useRouter()
const store = useGruposClaseStore()

const grupo = ref<GrupoClase | null>(null)
const criterios = ref<ModeloEvaluacion | null>(null)
const entregas = ref<EntregaClase[]>([])
const alumnos = ref<AlumnoClase[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const busqueda = ref('')
const filtroEstado = ref<'todas' | 'abiertas' | 'bloqueadas' | 'sin-rubrica' | 'sin-ra'>('todas')
const entregaABorrar = ref<EntregaClase | null>(null)
const borrando = ref(false)
const entregaABloquear = ref<EntregaClase | null>(null)
const accionBloqueo = ref<'bloquear' | 'desbloquear'>('bloquear')
const bloqueando = ref(false)
const exportando = ref(false)
const preparandoVista = ref(false)
const ventanaPrevia = ref<Window | null>(null)
const opcionesExportacion = ref<OpcionesExportacionEntregas | null>(null)

const id = computed(() => Number(route.params.grupoId))

const entregasFiltradas = computed(() => {
  const termino = normalizar(busqueda.value.trim())
  return entregas.value.filter((entrega) => {
    if (filtroEstado.value === 'abiertas' && entrega.bloqueada) return false
    if (filtroEstado.value === 'bloqueadas' && !entrega.bloqueada) return false
    if (filtroEstado.value === 'sin-rubrica' && tieneRubrica(entrega)) return false
    if (filtroEstado.value === 'sin-ra' && entrega.criterios > 0) return false
    if (!termino) return true
    return normalizar(`${entrega.titulo} ${entrega.descripcion ?? ''}`).includes(termino)
  })
})

const hayFiltros = computed(
  () => busqueda.value.trim().length > 0 || filtroEstado.value !== 'todas'
)

const totalAlumnos = computed(() => alumnos.value.length)

const resumen = computed(() => {
  const visibles = entregasFiltradas.value
  return {
    total: visibles.length,
    conRubrica: visibles.filter(tieneRubrica).length,
    conRa: visibles.filter((entrega) => entrega.criterios > 0).length,
    bloqueadas: visibles.filter((entrega) => entrega.bloqueada).length
  }
})

const PALETA_CATEGORIAS = ['#2563eb', '#d98a2b', '#067647', '#7c3aed', '#be185d', '#0891b2']

const secciones = computed(() => {
  const categorias = criterios.value?.categorias ?? []
  const resultado = categorias
    .map((categoria, indice) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      peso: categoria.peso,
      color: PALETA_CATEGORIAS[indice % PALETA_CATEGORIAS.length],
      entregas: entregasFiltradas.value.filter((entrega) => entrega.categoria_id === categoria.id)
    }))
    .filter((seccion) => seccion.entregas.length > 0)

  const conocidas = new Set(categorias.map((categoria) => categoria.id))
  const huerfanas = entregasFiltradas.value.filter(
    (entrega) => !conocidas.has(entrega.categoria_id)
  )
  if (huerfanas.length > 0) {
    resultado.push({
      id: 'sin-categoria',
      nombre: 'Sin categoría',
      peso: 0,
      color: '#98a2b3',
      entregas: huerfanas
    })
  }
  return resultado
})

function fechaCorta(fecha: string | null): string {
  if (!fecha) return '—'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function hoyISO(): string {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function estadoFecha(entrega: EntregaClase): { etiqueta: string; clase: string } | null {
  if (!entrega.fecha_limite) return null
  const hoy = hoyISO()
  if (entrega.fecha_limite < hoy) return { etiqueta: 'Vencida', clase: 'chip--peligro' }
  if (entrega.fecha_limite === hoy) return { etiqueta: 'Hoy', clase: 'chip--aviso' }

  const dias = Math.round(
    (new Date(`${entrega.fecha_limite}T00:00:00`).getTime() -
      new Date(`${hoy}T00:00:00`).getTime()) /
      86400000
  )
  if (dias > 0 && dias <= 7) {
    return {
      etiqueta: dias === 1 ? 'Mañana' : `En ${dias} días`,
      clase: 'chip--proximo'
    }
  }
  return null
}

function porcentajeRegistro(entrega: EntregaClase): number {
  if (totalAlumnos.value === 0) return 0
  return Math.min(100, Math.round((entrega.notas / totalAlumnos.value) * 100))
}

function limpiarFiltros(): void {
  busqueda.value = ''
  filtroEstado.value = 'todas'
}

function etiquetaTipo(tipo: string): string {
  const etiquetas: Record<string, string> = {
    tarea: 'Tarea',
    practica: 'Práctica',
    examen: 'Examen',
    proyecto: 'Proyecto'
  }
  return etiquetas[tipo] ?? tipo
}

function inicialTipo(tipo: string): string {
  return etiquetaTipo(tipo).charAt(0).toUpperCase()
}

function tieneRubrica(entrega: EntregaClase): boolean {
  return Boolean(entrega.rubrica || entrega.rubrica_archivo)
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
    criterios.value = await window.api.criterios.obtener(grupo.value.id)
    entregas.value = await window.api.entregasClase.listar(grupo.value.id)
    alumnos.value = await window.api.alumnosClase.listar(grupo.value.id)
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(id, cargar)

function accionesEntrega(entrega: EntregaClase): AccionMenu[] {
  return [
    { id: 'notas', etiqueta: 'Ver notas y anotaciones', icono: 'notas' },
    { id: 'exportar', etiqueta: 'Exportar entrega', icono: 'descargar' },
    { id: 'evidencias', etiqueta: `Evidencias (${entrega.evidencias})`, icono: 'evidencias' },
    {
      id: 'editar',
      etiqueta: 'Editar entrega',
      icono: 'editar',
      deshabilitada: entrega.bloqueada,
      motivo: entrega.bloqueada ? 'La entrega está bloqueada' : undefined
    },
    {
      id: 'bloquear',
      etiqueta: entrega.bloqueada ? 'Desbloquear entrega' : 'Bloquear entrega',
      icono: entrega.bloqueada ? 'desbloquear' : 'bloquear'
    },
    {
      id: 'borrar',
      etiqueta: 'Borrar entrega',
      icono: 'borrar',
      peligro: true,
      deshabilitada: entrega.bloqueada,
      motivo: entrega.bloqueada ? 'La entrega está bloqueada' : undefined
    }
  ]
}

function ejecutarAccion(entrega: EntregaClase, accion: string): void {
  if (accion === 'notas') irANotas(entrega)
  else if (accion === 'exportar') void previsualizar('entrega', entrega.id)
  else if (accion === 'evidencias') irAEvidencias(entrega)
  else if (accion === 'editar') irAEditar(entrega)
  else if (accion === 'bloquear') abrirBloqueo(entrega)
  else if (accion === 'borrar') entregaABorrar.value = entrega
}

function irAEvidencias(entrega: EntregaClase): void {
  router.push({
    name: 'entrega-evidencias',
    params: { grupoId: grupo.value?.id, entregaId: entrega.id }
  })
}

function irANotas(entrega: EntregaClase): void {
  router.push({
    name: 'entrega-notas',
    params: { grupoId: grupo.value?.id, entregaId: entrega.id }
  })
}

function irAEditar(entrega: EntregaClase): void {
  if (entrega.bloqueada) return
  router.push({
    name: 'entrega-editar',
    params: { grupoId: grupo.value?.id, entregaId: entrega.id }
  })
}

function ventanaConBarra(vista: VistaPreviaEntregas): string {
  const boton = vista.conArchivos ? 'Exportar ZIP' : 'Exportar PDF'
  return vista.html.replace(
    '</body>',
    `<style>
      .vista-previa-barra { position: fixed; z-index: 9999; top: 0; right: 0; left: 0; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 12px 18px; color: #1c2a38; background: rgba(255,255,255,.96); border-bottom: 1px solid #dbe5ee; box-shadow: 0 4px 18px -14px rgba(16,24,40,.5); font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .vista-previa-barra strong { display: block; font-size: 13px; }
      .vista-previa-barra span { color: #5a6b7b; font-size: 11px; }
      .vista-previa-barra__acciones { display: flex; align-items: center; gap: 8px; }
      .vista-previa-barra button { padding: 7px 12px; border: 1px solid #d0d5dd; border-radius: 7px; background: #fff; color: #344054; font: inherit; cursor: pointer; }
      .vista-previa-barra button:last-child { border-color: #0d5c8c; background: #0d5c8c; color: #fff; }
      @media print { .vista-previa-barra { display: none !important; } body { padding-top: 0 !important; } }
      body { padding-top: 68px !important; }
    </style>
    <div class="vista-previa-barra">
      <div><strong>Previsualización de entregas</strong><span>Revisa el dossier antes de descargarlo.</span></div>
      <div class="vista-previa-barra__acciones">
        <button type="button" onclick="window.close()">Cerrar</button>
        <button type="button" id="vista-previa-exportar">${boton}</button>
      </div>
    </div>
    <script>
      document.getElementById('vista-previa-exportar').addEventListener('click', function () {
        if (window.opener) window.opener.postMessage({ tipo: 'entregas-exportar' }, '*')
      })
    <\/script>
    </body>`
  )
}

function alMensajeVistaPrevia(evento: MessageEvent): void {
  if (evento.data?.tipo !== 'entregas-exportar') return
  if (ventanaPrevia.value && evento.source !== ventanaPrevia.value) return
  void confirmarExportacion()
}

window.addEventListener('message', alMensajeVistaPrevia)
onBeforeUnmount(() => {
  window.removeEventListener('message', alMensajeVistaPrevia)
  if (ventanaPrevia.value && !ventanaPrevia.value.closed) ventanaPrevia.value.close()
})

async function previsualizar(
  ambito: 'entrega' | 'avaluacion' | 'curso',
  entregaId?: number
): Promise<void> {
  if (!grupo.value || preparandoVista.value) return
  preparandoVista.value = true
  error.value = null
  mensaje.value = null
  try {
    const opciones: OpcionesExportacionEntregas = {
      ambito,
      entregaId
    }
    const vista = await window.api.entregasClase.vistaPrevia(grupo.value.id, opciones)
    opcionesExportacion.value = opciones
    if (ventanaPrevia.value && !ventanaPrevia.value.closed) ventanaPrevia.value.close()
    const ventana = window.open(
      '',
      'vista-previa-entregas',
      'width=1120,height=860,menubar=no,toolbar=no'
    )
    if (!ventana) {
      error.value =
        'El navegador ha bloqueado la ventana de previsualización. Permite las ventanas emergentes.'
      return
    }
    ventanaPrevia.value = ventana
    ventana.document.open()
    ventana.document.write(ventanaConBarra(vista))
    ventana.document.close()
    ventana.document.title = `Entregas · ${vista.titulo}`
    ventana.focus()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    preparandoVista.value = false
  }
}

async function confirmarExportacion(): Promise<void> {
  if (!grupo.value || !opcionesExportacion.value || exportando.value) return
  exportando.value = true
  error.value = null
  try {
    const resultado = await window.api.entregasClase.exportar(
      grupo.value.id,
      opcionesExportacion.value
    )
    if (resultado.ok) {
      mensaje.value = resultado.ruta
        ? `Entregas exportadas: ${resultado.ruta}`
        : (resultado.mensaje ?? 'Entregas exportadas.')
      if (ventanaPrevia.value && !ventanaPrevia.value.closed) ventanaPrevia.value.close()
      ventanaPrevia.value = null
    } else if (resultado.mensaje && resultado.mensaje !== 'Guardado cancelado') {
      error.value = resultado.mensaje
    }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    exportando.value = false
  }
}

async function borrar(): Promise<void> {
  if (!entregaABorrar.value || !grupo.value) return
  borrando.value = true
  error.value = null
  try {
    await window.api.entregasClase.borrar(entregaABorrar.value.id)
    mensaje.value = `Entrega «${entregaABorrar.value.titulo}» borrada.`
    entregaABorrar.value = null
    entregas.value = await window.api.entregasClase.listar(grupo.value.id)
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    borrando.value = false
  }
}

function abrirBloqueo(entrega: EntregaClase): void {
  entregaABloquear.value = entrega
  accionBloqueo.value = entrega.bloqueada ? 'desbloquear' : 'bloquear'
}

async function confirmarBloqueo(): Promise<void> {
  if (!entregaABloquear.value || !grupo.value) return
  bloqueando.value = true
  error.value = null
  try {
    const actualizada = await window.api.entregasClase.bloquear(
      entregaABloquear.value.id,
      accionBloqueo.value === 'bloquear'
    )
    if (actualizada) {
      mensaje.value = actualizada.bloqueada
        ? `Entrega «${actualizada.titulo}» bloqueada.`
        : `Entrega «${actualizada.titulo}» desbloqueada.`
    }
    entregaABloquear.value = null
    entregas.value = await window.api.entregasClase.listar(grupo.value.id)
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    bloqueando.value = false
  }
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver :a="grupo ? { name: 'grupo', params: { id: grupo.id } } : '/grupos'" />

    <header class="vista__cabecera">
      <h2>Entregas y evidencias</h2>
      <p v-if="grupo" class="tenue">
        Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }}
      </p>
    </header>

    <div v-if="cargando && !grupo" class="vacio">Cargando entregas…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <div v-else-if="grupo && !criterios" class="tarjeta">
      <h3>Primero, los criterios</h3>
      <p class="tenue">
        Las entregas se ubican en una avaluación y una categoría. Define los criterios de
        calificación del grupo antes de crearlas.
      </p>
      <RouterLink
        class="boton boton--principal"
        :to="{ name: 'criterios', params: { grupoId: grupo.id } }"
      >
        Ir a criterios
      </RouterLink>
    </div>

    <template v-else-if="grupo">
      <div class="informe__controles">
        <label class="entrega__buscador">
          <span class="visualmente-oculto">Buscar entrega</span>
          <input v-model="busqueda" type="search" placeholder="Buscar entrega…" />
        </label>
        <select v-model="filtroEstado" aria-label="Filtrar por estado">
          <option value="todas">Todos los estados</option>
          <option value="abiertas">Abiertas</option>
          <option value="bloqueadas">Bloqueadas</option>
          <option value="sin-rubrica">Sin rúbrica</option>
          <option value="sin-ra">Sin RA/CE</option>
        </select>
        <span class="chip">{{ entregasFiltradas.length }} de {{ entregas.length }}</span>
        <span class="barra__espacio"></span>
        <button
          class="boton"
          type="button"
          :disabled="exportando || preparandoVista"
          @click="previsualizar('curso')"
        >
          {{ exportando ? 'Exportando…' : 'Exportar curso' }}
        </button>
        <RouterLink
          class="boton boton--principal"
          :to="{
            name: 'entrega-nueva',
            params: { grupoId: grupo.id }
          }"
        >
          Nueva entrega
        </RouterLink>
      </div>

      <div v-if="entregas.length > 0" class="alumnado__resumen" aria-label="Resumen de entregas">
        <article class="tarjeta alumnado__stat">
          <span class="tenue">Entregas</span>
          <strong>{{ resumen.total }}</strong>
        </article>
        <article class="tarjeta alumnado__stat alumnado__stat--ok">
          <span class="tenue">Con rúbrica</span>
          <strong>{{ resumen.conRubrica }}</strong>
        </article>
        <article class="tarjeta alumnado__stat">
          <span class="tenue">Con RA/CE</span>
          <strong>{{ resumen.conRa }}</strong>
        </article>
        <article
          class="tarjeta alumnado__stat"
          :class="{ 'alumnado__stat--aviso': resumen.bloqueadas > 0 }"
        >
          <span class="tenue">Bloqueadas</span>
          <strong>{{ resumen.bloqueadas }}</strong>
        </article>
      </div>

      <div class="tarjeta">
        <div class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Listado</h3>
            <span class="tenue">
              {{ entregasFiltradas.length }} de {{ entregas.length }} entregas
            </span>
          </div>
        </div>

        <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

        <div v-if="entregas.length === 0" class="vacio">
          Todavía no hay entregas en este grupo. Crea la primera, asígnale una rúbrica y mapeála a
          los RA/CE.
        </div>

        <template v-else>
          <div v-if="entregasFiltradas.length === 0" class="vacio">
            <template v-if="hayFiltros">
              No hay entregas que coincidan con los filtros.
              <div class="entrega__vacio-accion">
                <button class="boton" type="button" @click="limpiarFiltros">Limpiar filtros</button>
              </div>
            </template>
            <template v-else>No hay entregas en esta avaluación.</template>
          </div>

          <div v-else class="tabla-scroll">
            <table class="tabla entregas-tabla">
              <thead>
                <tr>
                  <th scope="col">Entrega</th>
                  <th scope="col">Fecha límite</th>
                  <th scope="col" class="num" title="Alumnos con nota o anotación">Registros</th>
                  <th scope="col" class="acciones">Acciones</th>
                </tr>
              </thead>
              <tbody v-for="seccion in secciones" :key="seccion.id">
                <tr class="entregas-tabla__grupo" :style="{ '--color-grupo': seccion.color }">
                  <td colspan="4">
                    <div class="entregas-tabla__grupo-contenido">
                      <span class="entregas-tabla__grupo-nombre" :style="{ color: seccion.color }">
                        {{ seccion.nombre }}
                      </span>
                      <span class="tenue">
                        {{ seccion.peso > 0 ? `${seccion.peso} % de la nota · ` : '' }}
                        {{ seccion.entregas.length }}
                        {{ seccion.entregas.length === 1 ? 'entrega' : 'entregas' }}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr v-for="entrega in seccion.entregas" :key="entrega.id">
                  <td class="entregas-tabla__entrega">
                    <div class="entregas-tabla__fila">
                      <span
                        class="entregas-tabla__marca"
                        :class="`entregas-tabla__marca--${entrega.tipo}`"
                        aria-hidden="true"
                      >
                        {{ inicialTipo(entrega.tipo) }}
                      </span>
                      <div class="entregas-tabla__datos">
                        <div class="entrega__titulo">
                          <button class="entrega__enlace" type="button" @click="irANotas(entrega)">
                            {{ entrega.titulo }}
                          </button>
                          <span class="chip">{{ etiquetaTipo(entrega.tipo) }}</span>
                          <span v-if="entrega.bloqueada" class="chip chip--aviso"> Bloqueada </span>
                        </div>
                        <span v-if="entrega.descripcion" class="entrega__descripcion">
                          {{ entrega.descripcion }}
                        </span>
                        <span
                          v-if="entrega.evidencias > 0 || entrega.criterios > 0"
                          class="entrega__meta"
                        >
                          <template v-if="entrega.evidencias > 0">
                            {{ entrega.evidencias }}
                            {{ entrega.evidencias === 1 ? 'evidencia' : 'evidencias' }}
                          </template>
                          <template v-if="entrega.evidencias > 0 && entrega.criterios > 0">
                            ·
                          </template>
                          <template v-if="entrega.criterios > 0">
                            {{ entrega.criterios }} RA/CE
                          </template>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="entrega__fecha">
                      <span>{{ fechaCorta(entrega.fecha_limite) }}</span>
                      <span
                        v-if="estadoFecha(entrega)"
                        class="chip"
                        :class="estadoFecha(entrega)?.clase"
                      >
                        {{ estadoFecha(entrega)?.etiqueta }}
                      </span>
                    </div>
                  </td>
                  <td class="num">
                    <div class="entrega__registros">
                      <span class="entrega__registros-cifra">
                        <strong>{{ entrega.notas }}</strong>
                        <span class="tenue"> / {{ totalAlumnos }}</span>
                      </span>
                      <div
                        class="entrega__progreso"
                        role="progressbar"
                        :aria-label="`Registros de ${entrega.titulo}`"
                        :aria-valuenow="Math.min(entrega.notas, totalAlumnos)"
                        aria-valuemin="0"
                        :aria-valuemax="totalAlumnos || 1"
                        :title="`${entrega.notas} de ${totalAlumnos} alumnos con nota o anotación`"
                      >
                        <span :style="{ width: `${porcentajeRegistro(entrega)}%` }"></span>
                      </div>
                    </div>
                  </td>
                  <td class="acciones">
                    <MenuAcciones
                      :acciones="accionesEntrega(entrega)"
                      @accion="ejecutarAccion(entrega, $event)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </template>

    <Confirmacion
      v-if="entregaABorrar"
      titulo="¿Borrar la entrega?"
      etiqueta-confirmar="Sí, borrar"
      peligro
      :ocupado="borrando"
      @cancelar="entregaABorrar = null"
      @confirmar="borrar"
    >
      <p>
        Se va a borrar <strong>{{ entregaABorrar.titulo }}</strong
        >.
      </p>
      <p class="tenue">También se perderán sus notas y anotaciones.</p>
    </Confirmacion>

    <Confirmacion
      v-if="entregaABloquear"
      :titulo="accionBloqueo === 'bloquear' ? '¿Bloquear la entrega?' : '¿Desbloquear la entrega?'"
      :etiqueta-confirmar="accionBloqueo === 'bloquear' ? 'Sí, bloquear' : 'Sí, desbloquear'"
      :peligro="accionBloqueo === 'desbloquear'"
      :ocupado="bloqueando"
      @cancelar="entregaABloquear = null"
      @confirmar="confirmarBloqueo"
    >
      <p>
        <strong>{{ entregaABloquear.titulo }}</strong>
        <span v-if="entregaABloquear.notas === 0" class="tenue"> (aún sin notas)</span>
      </p>
      <p v-if="accionBloqueo === 'bloquear'" class="tenue">
        No se podrán editar sus datos, borrarla ni cambiar sus notas hasta que la desbloquees.
      </p>
      <p v-else class="tenue">Sus datos, notas y anotaciones volverán a ser editables.</p>
    </Confirmacion>
  </section>
</template>

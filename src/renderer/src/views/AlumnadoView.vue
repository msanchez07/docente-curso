<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import MenuAcciones, { type AccionMenu } from '@renderer/components/MenuAcciones.vue'
import { ESQUEMA_ALUMNADO } from '@shared/esquemas-importacion'
import { descargarJson } from '@renderer/utils/descargar-json'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import { copiarTexto } from '@renderer/utils/portapapeles'
import { notificar } from '@renderer/composables/notificaciones'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import type { AlumnoClase, AlumnoEntrada, GrupoClase } from '@shared/tipos'

const route = useRoute()
const router = useRouter()
const store = useGruposClaseStore()

const grupo = ref<GrupoClase | null>(null)
const alumnos = ref<AlumnoClase[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)

const busqueda = ref('')
const filtro = ref<'todos' | 'activos' | 'inactivos' | 'sin-correo'>('todos')

const mostrarForm = ref(false)
const formularioRef = ref<HTMLElement | null>(null)
const editando = ref<number | null>(null)
const guardando = ref(false)
const errorFormulario = ref<string | null>(null)
const form = reactive<AlumnoEntrada>({
  nombre: '',
  apellidos: '',
  dni: '',
  email: '',
  activo: true
})

const alumnoAQuitar = ref<AlumnoClase | null>(null)
const quitando = ref(false)

const mostrarImportar = ref(false)
const textoImportar = ref('')
const ficheroImportar = ref<HTMLInputElement | null>(null)
const errorImportar = ref<string | null>(null)
const importando = ref(false)

function accionesAlumno(alumno: AlumnoClase): AccionMenu[] {
  return [
    { id: 'ficha', etiqueta: 'Ver ficha del alumno', icono: 'rae' },
    { id: 'notas', etiqueta: 'Ver notas', icono: 'notas' },
    ...(alumno.email
      ? [{ id: 'copiar-correo', etiqueta: 'Copiar correo', icono: 'correo' as const }]
      : []),
    { id: 'formacion', etiqueta: 'Formación en empresa', icono: 'formacion' },
    { id: 'editar', etiqueta: 'Editar alumno', icono: 'editar' },
    {
      id: 'estado',
      etiqueta: alumno.activo ? 'Desactivar en el grupo' : 'Reactivar en el grupo',
      icono: alumno.activo ? 'desactivar' : 'reactivar'
    },
    { id: 'quitar', etiqueta: 'Quitar del grupo', icono: 'quitar', peligro: true }
  ]
}

function ejecutarAccionAlumno(alumno: AlumnoClase, accion: string): void {
  if (!grupo.value) return
  if (accion === 'ficha') {
    irAFicha(alumno)
  } else if (accion === 'notas') {
    irANotas(alumno)
  } else if (accion === 'copiar-correo') {
    void copiarCorreo(alumno)
  } else if (accion === 'formacion') {
    router.push({
      name: 'alumno-formacion',
      params: { grupoId: grupo.value.id, alumnoId: alumno.id }
    })
  } else if (accion === 'editar') {
    editar(alumno)
  } else if (accion === 'estado') {
    void alternarActivo(alumno)
  } else if (accion === 'quitar') {
    alumnoAQuitar.value = alumno
  }
}

async function copiarCorreo(alumno: AlumnoClase): Promise<void> {
  if (!alumno.email) return
  if (await copiarTexto(alumno.email)) {
    mensaje.value = `Correo de ${alumno.nombre} ${alumno.apellidos} copiado.`
    notificar(mensaje.value)
  }
}

function irAFicha(alumno: AlumnoClase): void {
  if (!grupo.value) return
  router.push({
    name: 'alumno',
    params: { grupoId: grupo.value.id, alumnoId: alumno.id }
  })
}

function irANotas(alumno: AlumnoClase): void {
  if (!grupo.value) return
  router.push({
    name: 'calificaciones',
    params: { grupoId: grupo.value.id },
    query: { alumno: alumno.id }
  })
}

function limpiarFiltros(): void {
  busqueda.value = ''
  filtro.value = 'todos'
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function iniciales(alumno: AlumnoClase): string {
  return `${alumno.nombre[0] ?? ''}${alumno.apellidos[0] ?? ''}`.toUpperCase()
}

const visibles = computed(() => {
  const termino = normalizar(busqueda.value.trim())
  return alumnos.value.filter((alumno) => {
    if (filtro.value === 'activos' && !alumno.activo) return false
    if (filtro.value === 'inactivos' && alumno.activo) return false
    if (filtro.value === 'sin-correo' && alumno.email) return false
    if (!termino) return true
    return [alumno.nombre, alumno.apellidos, alumno.dni ?? '', alumno.email ?? ''].some((valor) =>
      normalizar(valor).includes(termino)
    )
  })
})

const hayFiltros = computed(() => busqueda.value.trim().length > 0 || filtro.value !== 'todos')

const resumen = computed(() => {
  const lista = visibles.value
  return {
    total: lista.length,
    activos: lista.filter((alumno) => alumno.activo).length,
    inactivos: lista.filter((alumno) => !alumno.activo).length,
    sinCorreo: lista.filter((alumno) => !alumno.email).length
  }
})

const id = computed(() => Number(route.params.grupoId))

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
    alumnos.value = await window.api.alumnosClase.listar(id.value)
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

async function refrescar(): Promise<void> {
  alumnos.value = await window.api.alumnosClase.listar(id.value)
  await store.cargar(true)
}

onMounted(cargar)
watch(id, cargar)

function nuevo(): void {
  editando.value = null
  Object.assign(form, {
    nombre: '',
    apellidos: '',
    dni: '',
    email: '',
    activo: true
  })
  errorFormulario.value = null
  mostrarForm.value = true
  void nextTick(() => formularioRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function editar(alumno: AlumnoClase): void {
  editando.value = alumno.id
  Object.assign(form, {
    nombre: alumno.nombre,
    apellidos: alumno.apellidos,
    dni: alumno.dni ?? '',
    email: alumno.email ?? '',
    activo: alumno.activo
  })
  errorFormulario.value = null
  mostrarForm.value = true
  void nextTick(() => formularioRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

async function guardar(): Promise<void> {
  if (!grupo.value) return
  errorFormulario.value = null
  guardando.value = true
  try {
    const datos = { ...form, grupos: undefined }
    if (editando.value === null) {
      const resultado = await window.api.alumnosClase.crear(grupo.value.id, datos)
      mensaje.value = resultado.creado
        ? `Alumno «${resultado.alumno.apellidos}, ${resultado.alumno.nombre}» añadido.`
        : `«${resultado.alumno.apellidos}, ${resultado.alumno.nombre}» ya existía; se ha matriculado en el grupo.`
    } else {
      await window.api.alumnosClase.actualizar(editando.value, datos)
      mensaje.value = 'Datos del alumno actualizados.'
    }
    notificar(mensaje.value ?? '')
    mostrarForm.value = false
    await refrescar()
  } catch (e) {
    errorFormulario.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function alternarActivo(alumno: AlumnoClase): Promise<void> {
  error.value = null
  try {
    await window.api.alumnosClase.activar(alumno.id, !alumno.activo)
    mensaje.value = alumno.activo
      ? `«${alumno.apellidos}, ${alumno.nombre}» desactivado.`
      : `«${alumno.apellidos}, ${alumno.nombre}» reactivado.`
    notificar(mensaje.value)
    await refrescar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  }
}

async function quitarDelGrupo(): Promise<void> {
  if (!alumnoAQuitar.value || !grupo.value) return
  quitando.value = true
  error.value = null
  try {
    await window.api.alumnosClase.desmatricular(grupo.value.id, alumnoAQuitar.value.id)
    mensaje.value = `«${alumnoAQuitar.value.apellidos}, ${alumnoAQuitar.value.nombre}» ya no está en el grupo.`
    notificar(mensaje.value)
    alumnoAQuitar.value = null
    await refrescar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    quitando.value = false
  }
}

function accionesCabecera(): AccionMenu[] {
  return [
    { id: 'importar', etiqueta: 'Importar alumnado', icono: 'importar' },
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
  descargarJson('esquema-alumnado.json', ESQUEMA_ALUMNADO)
}

async function importarTexto(texto: string): Promise<void> {
  if (!grupo.value || !texto.trim()) return
  importando.value = true
  errorImportar.value = null
  try {
    const resultado = await window.api.matriculasClase.importar(grupo.value.id, texto)
    mensaje.value = `${resultado.creados} alumnos nuevos y ${resultado.existentes} ya existentes matriculados.`
    notificar(mensaje.value)
    error.value = resultado.errores.length > 0 ? resultado.errores.slice(0, 6).join(' · ') : null
    mostrarImportar.value = false
    await refrescar()
  } catch (e) {
    errorImportar.value = (e as Error).message ?? String(e)
  } finally {
    importando.value = false
  }
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
    <BotonVolver :a="grupo ? { name: 'grupo', params: { id: grupo.id } } : '/grupos'" />

    <header class="vista__cabecera">
      <h2>Alumnado del grupo</h2>
      <p v-if="grupo" class="tenue">
        Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }}
      </p>
    </header>

    <div v-if="cargando && !grupo" class="vacio">Cargando alumnado…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="grupo">
      <div class="informe__controles">
        <label class="entrega__buscador">
          <span class="visualmente-oculto">Buscar alumno</span>
          <input v-model="busqueda" type="search" placeholder="Buscar alumno…" />
        </label>
        <select v-model="filtro" aria-label="Filtrar por estado">
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="sin-correo">Sin correo</option>
        </select>
        <span class="chip">{{ visibles.length }} de {{ alumnos.length }}</span>
        <span class="barra__espacio"></span>
        <MenuAcciones
          texto="Acciones"
          :acciones="accionesCabecera()"
          @accion="ejecutarAccionCabecera"
        />
        <button class="boton boton--principal" type="button" @click="nuevo">Nuevo alumno</button>
      </div>

      <div v-if="alumnos.length > 0" class="alumnado__resumen" aria-label="Resumen del alumnado">
        <article class="tarjeta alumnado__stat">
          <span class="tenue">Alumnos</span>
          <strong>{{ resumen.total }}</strong>
        </article>
        <article class="tarjeta alumnado__stat alumnado__stat--ok">
          <span class="tenue">Activos</span>
          <strong>{{ resumen.activos }}</strong>
        </article>
        <article class="tarjeta alumnado__stat alumnado__stat--muted">
          <span class="tenue">Inactivos</span>
          <strong>{{ resumen.inactivos }}</strong>
        </article>
        <article
          class="tarjeta alumnado__stat"
          :class="{ 'alumnado__stat--aviso': resumen.sinCorreo > 0 }"
        >
          <span class="tenue">Sin correo</span>
          <strong>{{ resumen.sinCorreo }}</strong>
        </article>
      </div>

      <div class="tarjeta">
        <div class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Listado</h3>
            <span class="tenue"> {{ visibles.length }} de {{ alumnos.length }} alumnos </span>
          </div>
        </div>

        <div v-if="mostrarImportar" class="programacion__importar">
          <p class="tenue">
            Acepta JSON o CSV. Las columnas se reconocen por su nombre —
            <span class="monospace">nombre</span>, <span class="monospace">apellidos</span>,
            <span class="monospace">dni</span> y <span class="monospace">correo</span>—. Si la
            persona ya existe, no se duplica: se matricula en este grupo.
          </p>
          <div class="barra">
            <button class="boton" type="button" @click="ficheroImportar?.click()">
              Elegir fichero…
            </button>
            <input
              ref="ficheroImportar"
              class="visualmente-oculto"
              type="file"
              accept=".json,.csv,.txt"
              @change="alElegirFichero"
            />
            <span class="tenue">o pega el contenido abajo</span>
          </div>
          <textarea
            v-model="textoImportar"
            rows="5"
            class="monospace"
            placeholder="nombre;apellidos;dni;correo"
          ></textarea>
          <p v-if="errorImportar" class="aviso aviso--error" role="alert">{{ errorImportar }}</p>
          <div class="criterios__pie-fila">
            <button class="boton" type="button" @click="mostrarImportar = false">Cancelar</button>
            <span class="barra__espacio"></span>
            <button
              class="boton boton--principal"
              type="button"
              :disabled="importando || !textoImportar.trim()"
              @click="importarTexto(textoImportar)"
            >
              {{ importando ? 'Importando…' : 'Importar' }}
            </button>
          </div>
        </div>

        <section v-if="mostrarForm" ref="formularioRef" class="tarjeta form-inline">
          <header class="entrega-form__seccion-cabecera">
            <div>
              <h3>{{ editando === null ? 'Nuevo alumno' : 'Editar alumno' }}</h3>
              <p class="tenue">Datos personales y estado de matrícula en este grupo.</p>
            </div>
            <div class="form-inline__acciones">
              <button class="boton" type="button" @click="mostrarForm = false">Cancelar</button>
              <button
                class="boton boton--principal"
                type="button"
                :disabled="guardando || !form.nombre.trim() || !form.apellidos.trim()"
                @click="guardar"
              >
                {{
                  guardando ? 'Guardando…' : editando === null ? 'Añadir alumno' : 'Guardar cambios'
                }}
              </button>
            </div>
          </header>

          <p v-if="errorFormulario" class="aviso aviso--error" role="alert">
            {{ errorFormulario }}
          </p>

          <div class="formulario">
            <div class="campo">
              <label for="alumno-nombre">Nombre *</label>
              <input id="alumno-nombre" v-model="form.nombre" />
            </div>
            <div class="campo">
              <label for="alumno-apellidos">Apellidos *</label>
              <input id="alumno-apellidos" v-model="form.apellidos" />
            </div>
            <div class="campo">
              <label for="alumno-dni">DNI</label>
              <input id="alumno-dni" v-model="form.dni" placeholder="12345678Z" />
            </div>
            <div class="campo">
              <label for="alumno-email">Correo</label>
              <input id="alumno-email" v-model="form.email" placeholder="alumno@ejemplo.com" />
            </div>
            <div class="campo">
              <label for="alumno-activo">Estado</label>
              <select id="alumno-activo" v-model="form.activo">
                <option :value="true">Activo</option>
                <option :value="false">Inactivo</option>
              </select>
            </div>
          </div>
        </section>

        <div v-if="alumnos.length === 0" class="vacio">
          Todavía no hay alumnado en este grupo. Importa una lista o da de alta a la primera
          persona.
        </div>

        <template v-else>
          <div v-if="visibles.length === 0" class="vacio">
            <template v-if="hayFiltros">
              No hay nadie que coincida con la búsqueda o el filtro.
              <div class="entrega__vacio-accion">
                <button class="boton" type="button" @click="limpiarFiltros">Limpiar filtros</button>
              </div>
            </template>
            <template v-else>No hay alumnado en este grupo.</template>
          </div>

          <div v-else class="tabla-scroll">
            <table class="tabla alumnado-tabla">
              <thead>
                <tr>
                  <th scope="col">Alumno</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Estado</th>
                  <th scope="col" class="acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="alumno in visibles"
                  :key="alumno.id"
                  :class="{ 'fila--inactiva': !alumno.activo }"
                >
                  <td class="alumnado-tabla__alumno">
                    <span class="alumnado__avatar" aria-hidden="true">{{ iniciales(alumno) }}</span>
                    <div class="alumnado__identidad">
                      <button
                        class="alumno__enlace"
                        type="button"
                        :title="`Ver ficha de ${alumno.nombre} ${alumno.apellidos}`"
                        @click="irAFicha(alumno)"
                      >
                        {{ alumno.apellidos }}, {{ alumno.nombre }}
                      </button>
                      <span class="alumno__meta monospace">
                        {{ alumno.dni ? `DNI ${alumno.dni}` : 'Sin DNI' }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <a v-if="alumno.email" class="alumnado__email" :href="`mailto:${alumno.email}`">
                      {{ alumno.email }}
                    </a>
                    <span v-else class="chip chip--aviso">Sin correo</span>
                  </td>
                  <td>
                    <span class="chip" :class="alumno.activo ? 'chip--ok' : ''">
                      {{ alumno.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="acciones">
                    <MenuAcciones
                      :acciones="accionesAlumno(alumno)"
                      @accion="ejecutarAccionAlumno(alumno, $event)"
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
      v-if="alumnoAQuitar"
      titulo="¿Quitar del grupo?"
      etiqueta-confirmar="Sí, quitar"
      peligro
      :ocupado="quitando"
      @cancelar="alumnoAQuitar = null"
      @confirmar="quitarDelGrupo"
    >
      <p>
        <strong>{{ alumnoAQuitar.apellidos }}, {{ alumnoAQuitar.nombre }}</strong> dejará de estar
        en este grupo.
      </p>
      <p class="tenue">
        No se borra del sistema: si está en otros grupos, sigue en ellos. Sus datos se conservan.
      </p>
    </Confirmacion>
  </section>
</template>

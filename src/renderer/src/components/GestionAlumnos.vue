<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import SelectorGrupo from '@renderer/components/SelectorGrupo.vue'
import { ESQUEMA_ALUMNADO } from '@shared/esquemas-importacion'
import { descargarJson } from '@renderer/utils/descargar-json'
import { useAppStore } from '@renderer/stores/app'
import type { Alumno, AlumnoEntrada } from '@shared/tipos'

const store = useAppStore()

const alumnos = ref<Alumno[]>([])
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const mostrarForm = ref(false)
const mostrarImportar = ref(false)
const editando = ref<number | null>(null)
const entrada = ref('')

const form = reactive<AlumnoEntrada>({
  nombre: '',
  apellidos: '',
  dni: '',
  email: '',
  activo: true,
  grupos: []
})

async function cargar(): Promise<void> {
  if (store.grupoActivo === null) {
    alumnos.value = []
    return
  }
  alumnos.value = await window.api.alumnos.listar(store.grupoActivo)
}

onMounted(cargar)
watch(() => store.grupoActivo, cargar)

function nuevo(): void {
  editando.value = null
  Object.assign(form, {
    nombre: '',
    apellidos: '',
    dni: '',
    email: '',
    activo: true,
    grupos: store.grupoActivo !== null ? [store.grupoActivo] : []
  })
  error.value = null
  mostrarForm.value = true
}

function editar(alumno: Alumno): void {
  editando.value = alumno.id
  Object.assign(form, {
    nombre: alumno.nombre,
    apellidos: alumno.apellidos,
    dni: alumno.dni ?? '',
    email: alumno.email ?? '',
    activo: alumno.activo,
    grupos: [...alumno.grupos]
  })
  error.value = null
  mostrarForm.value = true
}

async function guardar(): Promise<void> {
  error.value = null
  try {
    const datos = { ...form, grupos: [...(form.grupos ?? [])] }
    if (editando.value === null) await window.api.alumnos.crear(datos)
    else await window.api.alumnos.actualizar(editando.value, datos)
    mostrarForm.value = false
    await store.cargarGrupos()
    await cargar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  }
}

async function borrar(alumno: Alumno): Promise<void> {
  if (!confirm(`¿Borrar a ${alumno.apellidos}, ${alumno.nombre}? Se perderán sus notas.`)) return
  await window.api.alumnos.borrar(alumno.id)
  await store.cargarGrupos()
  await cargar()
}

async function quitarDelGrupo(alumno: Alumno): Promise<void> {
  if (store.grupoActivo === null) return
  await window.api.alumnos.desmatricular(alumno.id, store.grupoActivo)
  await store.cargarGrupos()
  await cargar()
}

function exportarEsquema(): void {
  descargarJson('esquema-alumnado.json', ESQUEMA_ALUMNADO)
}

async function importarFichero(): Promise<void> {
  error.value = null
  mensaje.value = null
  try {
    const resultado = await window.api.alumnos.importarFichero(store.grupoActivo ?? undefined)
    if (resultado.cancelado) return
    if (!resultado.ok) {
      error.value = resultado.errores.join(' · ')
      return
    }
    mensaje.value = `${resultado.creados} alumnos añadidos al grupo desde ${resultado.ruta}`
    if (resultado.errores.length > 0) {
      error.value = resultado.errores.slice(0, 6).join(' · ')
    }
    mostrarImportar.value = false
    await store.cargarGrupos()
    await cargar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  }
}

async function importarTexto(): Promise<void> {
  error.value = null
  mensaje.value = null
  try {
    const resultado = await window.api.alumnos.importar(
      entrada.value,
      store.grupoActivo ?? undefined
    )
    mensaje.value = `${resultado.creados} alumnos añadidos al grupo.`
    if (resultado.errores.length > 0) {
      error.value = resultado.errores.slice(0, 6).join(' · ')
    }
    entrada.value = ''
    mostrarImportar.value = false
    await store.cargarGrupos()
    await cargar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  }
}
</script>

<template>
  <div>
    <header class="cabecera-criterios">
      <div class="cabecera-criterios__titulo">
        <h3>Alumnado</h3>
        <span class="tenue">El mismo alumno puede estar en varios grupos.</span>
      </div>
      <div class="cabecera-criterios__acciones">
        <SelectorGrupo />
        <button
          class="boton boton--principal"
          :disabled="store.grupoActivo === null"
          @click="nuevo"
        >
          Nuevo alumno
        </button>
        <button
          class="boton"
          :disabled="store.grupoActivo === null"
          @click="mostrarImportar = true"
        >
          Importar
        </button>
      </div>
    </header>

    <p v-if="mensaje" class="aviso" style="background: #ecfdf3; color: #067647" role="status">
      {{ mensaje }}
    </p>
    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <div v-if="store.grupoActivo === null" class="vacio">Selecciona un grupo.</div>
    <div v-else-if="alumnos.length === 0" class="vacio">
      No hay alumnado en este grupo. Añade uno o importa una lista.
    </div>

    <div v-else class="tabla-scroll">
      <table class="tabla">
        <thead>
          <tr>
            <th>Apellidos</th>
            <th>Nombre</th>
            <th>DNI</th>
            <th>Correo</th>
            <th>Estado</th>
            <th class="acciones">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="alumno in alumnos" :key="alumno.id">
            <td>{{ alumno.apellidos }}</td>
            <td>{{ alumno.nombre }}</td>
            <td class="monospace">{{ alumno.dni ?? '—' }}</td>
            <td>{{ alumno.email ?? '—' }}</td>
            <td>{{ alumno.activo ? 'Activo' : 'Inactivo' }}</td>
            <td class="acciones">
              <button class="boton" @click="editar(alumno)">Editar</button>
              <button class="boton" @click="quitarDelGrupo(alumno)">Quitar del grupo</button>
              <button class="boton boton--peligro" @click="borrar(alumno)">Borrar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Alta / edición -->
    <div v-if="mostrarForm" class="modal__fondo" @click.self="mostrarForm = false">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-alumno">
        <header class="modal__cabecera">
          <h3 id="titulo-alumno">{{ editando === null ? 'Nuevo alumno' : 'Editar alumno' }}</h3>
          <button class="boton" @click="mostrarForm = false">Cerrar</button>
        </header>
        <div class="modal__cuerpo">
          <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
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
              <label for="alumno-estado">Estado</label>
              <select id="alumno-estado" v-model="form.activo">
                <option :value="true">Activo</option>
                <option :value="false">Inactivo</option>
              </select>
            </div>
            <div class="campo campo--ancho">
              <label>Grupos en los que está matriculado</label>
              <div class="chips">
                <label v-for="g in store.grupos" :key="g.id" class="chip">
                  <input type="checkbox" :value="g.id" v-model="form.grupos" />
                  {{ g.modulo_codigo }} · {{ g.nombre }} ({{ g.modalidad }})
                </label>
              </div>
            </div>
          </div>
        </div>
        <footer class="modal__pie">
          <button class="boton" @click="mostrarForm = false">Cancelar</button>
          <button class="boton boton--principal" @click="guardar">Guardar</button>
        </footer>
      </div>
    </div>

    <!-- Importación -->
    <div v-if="mostrarImportar" class="modal__fondo" @click.self="mostrarImportar = false">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-importar">
        <header class="modal__cabecera">
          <h3 id="titulo-importar">Importar alumnado en «{{ store.grupo?.nombre }}»</h3>
          <button class="boton" @click="mostrarImportar = false">Cerrar</button>
        </header>
        <div class="modal__cuerpo">
          <p class="tenue">
            Elige el fichero con la lista (JSON o CSV). Las columnas se reconocen
            <strong>por su nombre</strong> — <span class="monospace">nombre</span>,
            <span class="monospace">apellidos</span>, <span class="monospace">dni</span> y
            <span class="monospace">correo</span> (o
            <span class="monospace">direccindecorreo</span>) — y las demás se ignoran. Los nombres
            en mayúsculas se normalizan. Todo el alumnado importado queda matriculado en este grupo.
          </p>
          <button class="boton boton--principal" @click="importarFichero">Elegir fichero…</button>
          <button class="boton" @click="exportarEsquema">Descargar esquema</button>

          <details style="margin-top: 16px">
            <summary class="tenue" style="cursor: pointer">…o pega el contenido</summary>
            <div class="campo" style="margin-top: 8px">
              <textarea v-model="entrada" rows="8" class="monospace"></textarea>
            </div>
            <button
              class="boton"
              style="margin-top: 8px"
              :disabled="!entrada.trim()"
              @click="importarTexto"
            >
              Importar lo pegado
            </button>
          </details>
        </div>
        <footer class="modal__pie">
          <button class="boton" @click="mostrarImportar = false">Cerrar</button>
        </footer>
      </div>
    </div>
  </div>
</template>

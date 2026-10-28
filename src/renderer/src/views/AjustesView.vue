<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import CriteriosCalificacion from '@renderer/components/CriteriosCalificacion.vue'
import GestionAlumnos from '@renderer/components/GestionAlumnos.vue'
import Pestanas from '@renderer/components/Pestanas.vue'
import { useAppStore } from '@renderer/stores/app'
import type { GrupoDetalle, GrupoEntrada } from '@shared/tipos'

const store = useAppStore()

const pestana = ref('grupos')
const pestanas = [
  { id: 'grupos', etiqueta: 'Grupos' },
  { id: 'alumnos', etiqueta: 'Alumnos' },
  { id: 'criterios', etiqueta: 'Criterios de calificación' }
]

const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)

const mostrarGrupo = ref(false)
const editandoGrupo = ref<number | null>(null)
const nombreTocado = ref(false)
const grupoForm = reactive<GrupoEntrada>({
  modulo_codigo: '',
  nombre: '',
  modalidad: 'presencial'
})

const mostrarVaciar = ref(false)
const vaciando = ref(false)

/** Nombre sugerido para un grupo: código del módulo + modalidad. */
function sugerirNombre(): string {
  const modalidad = grupoForm.modalidad === 'semipresencial' ? 'Semipresencial' : 'Presencial'
  return grupoForm.modulo_codigo ? `${grupoForm.modulo_codigo} · ${modalidad}` : modalidad
}

watch([() => grupoForm.modulo_codigo, () => grupoForm.modalidad], () => {
  if (!nombreTocado.value) grupoForm.nombre = sugerirNombre()
})

onMounted(() => store.inicializar())

function nuevoGrupo(): void {
  editandoGrupo.value = null
  nombreTocado.value = false
  grupoForm.modulo_codigo = store.modulos[0]?.codigo ?? ''
  grupoForm.modalidad = 'presencial'
  grupoForm.nombre = sugerirNombre()
  error.value = null
  mostrarGrupo.value = true
}

function editarGrupo(grupo: GrupoDetalle): void {
  editandoGrupo.value = grupo.id
  // Al editar se respeta el nombre que ya tuviera.
  nombreTocado.value = true
  Object.assign(grupoForm, {
    modulo_codigo: grupo.modulo_codigo,
    nombre: grupo.nombre,
    modalidad: grupo.modalidad
  })
  error.value = null
  mostrarGrupo.value = true
}

async function guardarGrupo(): Promise<void> {
  error.value = null
  try {
    if (editandoGrupo.value === null) await window.api.grupos.crear({ ...grupoForm })
    else await window.api.grupos.actualizar(editandoGrupo.value, { ...grupoForm })
    mostrarGrupo.value = false
    await store.cargarGrupos()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  }
}

async function borrarGrupo(grupo: GrupoDetalle): Promise<void> {
  if (
    !confirm(
      `¿Borrar el grupo «${grupo.nombre}»? Se eliminarán sus matrículas y sus criterios de calificación.`
    )
  ) {
    return
  }
  await window.api.grupos.borrar(grupo.id)
  await store.cargarGrupos()
}

async function vaciarBaseDeDatos(): Promise<void> {
  vaciando.value = true
  error.value = null
  mensaje.value = null
  try {
    await window.api.bd.vaciar()
    await store.inicializar(true)
    mostrarVaciar.value = false
    mensaje.value = 'Base de datos vaciada. Todo listo para empezar de nuevo.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    vaciando.value = false
  }
}
</script>

<template>
  <section class="vista">
    <header class="vista__cabecera">
      <h2>Ajustes</h2>
      <p class="tenue">Grupos, alumnado y criterios de calificación.</p>
    </header>

    <p v-if="mensaje" class="aviso" style="background: #ecfdf3; color: #067647" role="status">
      {{ mensaje }}
    </p>
    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <Pestanas v-model="pestana" :pestanas="pestanas" />

    <!-- Grupos -->
    <div
      v-if="pestana === 'grupos'"
      id="panel-grupos"
      role="tabpanel"
      aria-labelledby="pestana-grupos"
      tabindex="0"
    >
      <div class="tarjeta">
        <header class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Grupos</h3>
            <span class="tenue">
              Un grupo es un módulo en una modalidad. El resaltado es el que se usa en el resto de
              la aplicación.
            </span>
          </div>
          <div class="cabecera-criterios__acciones">
            <button class="boton boton--principal" @click="nuevoGrupo">Nuevo grupo</button>
          </div>
        </header>

        <div v-if="store.grupos.length === 0" class="vacio">
          Crea un grupo por cada módulo y modalidad que impartas (por ejemplo, «0613 · Presencial» y
          «0613 · Semipresencial»).
        </div>
        <div v-else class="tabla-scroll">
          <table class="tabla">
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Grupo</th>
                <th>Modalidad</th>
                <th class="num">Alumnos</th>
                <th class="acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="g in store.grupos"
                :key="g.id"
                class="fila-seleccionable"
                :class="{ 'fila--activa': g.id === store.grupoActivo }"
                @click="store.grupoActivo = g.id"
              >
                <td>
                  <span class="codigo">{{ g.modulo_codigo }}</span> {{ g.modulo_nombre }}
                </td>
                <td>
                  {{ g.nombre }}
                  <span v-if="g.id === store.grupoActivo" class="chip chip--ok">en uso</span>
                </td>
                <td>{{ g.modalidad === 'semipresencial' ? 'Semipresencial' : 'Presencial' }}</td>
                <td class="num">{{ g.alumnos }}</td>
                <td class="acciones" @click.stop>
                  <button class="boton" @click="editarGrupo(g)">Editar</button>
                  <button class="boton boton--peligro" @click="borrarGrupo(g)">Borrar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="tarjeta">
        <header class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Vaciar la base de datos</h3>
            <span class="tenue">
              Borra grupos, alumnado, entregas, notas y criterios para empezar un curso nuevo. Los
              datos del BOE se conservan.
            </span>
          </div>
          <div class="cabecera-criterios__acciones">
            <button class="boton boton--peligro" @click="mostrarVaciar = true">
              Vaciar la base de datos
            </button>
          </div>
        </header>
      </div>
    </div>

    <!-- Alumnos -->
    <div
      v-else-if="pestana === 'alumnos'"
      id="panel-alumnos"
      role="tabpanel"
      aria-labelledby="pestana-alumnos"
      tabindex="0"
    >
      <div class="tarjeta">
        <GestionAlumnos />
      </div>
    </div>

    <!-- Criterios de calificación -->
    <div
      v-else
      id="panel-criterios"
      role="tabpanel"
      aria-labelledby="pestana-criterios"
      tabindex="0"
    >
      <CriteriosCalificacion />
    </div>

    <!-- Alta / edición de grupo -->
    <div v-if="mostrarGrupo" class="modal__fondo" @click.self="mostrarGrupo = false">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-grupo">
        <header class="modal__cabecera">
          <h3 id="titulo-grupo">
            {{ editandoGrupo === null ? 'Nuevo grupo' : 'Editar grupo' }}
          </h3>
          <button class="boton" @click="mostrarGrupo = false">Cerrar</button>
        </header>
        <div class="modal__cuerpo">
          <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
          <div class="formulario">
            <div class="campo">
              <label for="grupo-modulo">Módulo *</label>
              <select id="grupo-modulo" v-model="grupoForm.modulo_codigo">
                <option v-for="m in store.modulos" :key="m.codigo" :value="m.codigo">
                  {{ m.codigo }} · {{ m.nombre }}
                </option>
              </select>
            </div>
            <div class="campo">
              <label for="grupo-nombre">Nombre del grupo *</label>
              <input
                id="grupo-nombre"
                v-model="grupoForm.nombre"
                placeholder="0613 · Presencial"
                @input="nombreTocado = true"
              />
            </div>
            <div class="campo">
              <label for="grupo-modalidad">Modalidad</label>
              <select id="grupo-modalidad" v-model="grupoForm.modalidad">
                <option value="presencial">Presencial</option>
                <option value="semipresencial">Semipresencial</option>
              </select>
            </div>
          </div>
        </div>
        <footer class="modal__pie">
          <button class="boton" @click="mostrarGrupo = false">Cancelar</button>
          <button
            class="boton boton--principal"
            :disabled="!grupoForm.nombre.trim() || !grupoForm.modulo_codigo"
            @click="guardarGrupo"
          >
            Guardar
          </button>
        </footer>
      </div>
    </div>

    <!-- Confirmación de vaciado -->
    <div v-if="mostrarVaciar" class="modal__fondo" @click.self="mostrarVaciar = false">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-vaciar">
        <header class="modal__cabecera">
          <h3 id="titulo-vaciar">¿Vaciar la base de datos?</h3>
          <button class="boton" @click="mostrarVaciar = false">Cerrar</button>
        </header>
        <div class="modal__cuerpo">
          <p>
            Se van a borrar <strong>todos</strong> los grupos, el alumnado, las entregas, las notas
            y los criterios de calificación.
          </p>
          <p class="tenue">
            Esta acción no se puede deshacer. Los datos del BOE (ciclos, módulos, RA y CE) se
            conservan.
          </p>
        </div>
        <footer class="modal__pie">
          <button class="boton" @click="mostrarVaciar = false">Cancelar</button>
          <button class="boton boton--peligro" :disabled="vaciando" @click="vaciarBaseDeDatos">
            {{ vaciando ? 'Vaciando…' : 'Sí, vaciar todo' }}
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>

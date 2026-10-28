<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import type { CursoAcademico } from '@shared/tipos'
import { useCursosAcademicosStore } from '@renderer/stores/cursos-academicos'

const store = useCursosAcademicosStore()
const router = useRouter()

const form = reactive({ nombre: '' })
const editando = ref<number | null>(null)
const guardando = ref(false)
const errorFormulario = ref<string | null>(null)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const cursoABorrar = ref<CursoAcademico | null>(null)
const borrando = ref(false)

const cursos = computed(() => store.cursos)

onMounted(() => store.cargar(true))

function cancelarEdicion(): void {
  editando.value = null
  form.nombre = ''
  errorFormulario.value = null
}

function editar(curso: CursoAcademico): void {
  editando.value = curso.id
  form.nombre = curso.nombre
  errorFormulario.value = null
}

async function guardar(): Promise<void> {
  if (editando.value === null) return
  errorFormulario.value = null
  guardando.value = true
  try {
    const actualizado = await store.actualizar(editando.value, { nombre: form.nombre })
    mensaje.value = actualizado
      ? `Curso académico «${actualizado.nombre}» actualizado.`
      : 'El curso académico ya no existe.'
    cancelarEdicion()
  } catch (e) {
    errorFormulario.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function verGrupos(curso: CursoAcademico): Promise<void> {
  store.activar(curso.id)
  await router.push({ name: 'grupos' })
}

async function borrar(): Promise<void> {
  if (!cursoABorrar.value) return
  borrando.value = true
  error.value = null
  try {
    const nombre = cursoABorrar.value.nombre
    await store.borrar(cursoABorrar.value.id)
    mensaje.value = `Curso académico «${nombre}» borrado.`
    cursoABorrar.value = null
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    borrando.value = false
  }
}
</script>

<template>
  <section class="vista vista--ancha">
    <header class="vista__cabecera">
      <h2>Cursos académicos</h2>
      <p class="tenue">
        Los cursos se crean automáticamente al crear un grupo, con el periodo que va del 1 de
        septiembre al 1 de julio. Aquí puedes renombrarlos o borrar los que ya no tengan grupos. No
        se crean a mano: el curso se crea al guardar un grupo.
      </p>
    </header>

    <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>
    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <div class="barra">
      <span class="tenue">
        {{ cursos.length }} {{ cursos.length === 1 ? 'curso' : 'cursos' }} · el actual se calcula
        por la fecha
      </span>
    </div>

    <div v-if="store.cargando && cursos.length === 0" class="vacio">
      Cargando cursos académicos…
    </div>
    <div v-else-if="cursos.length === 0" class="vacio">
      Todavía no hay cursos. Se creará el curso actual automáticamente al crear un grupo.
    </div>

    <div v-else class="tarjeta tarjeta--tabla">
      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Curso</th>
              <th>Periodo</th>
              <th>Estado</th>
              <th class="num">Grupos</th>
              <th class="acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="curso in cursos" :key="curso.id">
              <td>
                <strong>{{ curso.nombre }}</strong>
                <span v-if="curso.id === store.activoId" class="chip chip--activo">
                  en la barra
                </span>
              </td>
              <td>{{ curso.inicio }} – {{ curso.fin }}</td>
              <td>
                <span :class="curso.actual ? 'chip chip--ok' : 'chip'">
                  {{ curso.actual ? 'Actual' : 'Anterior' }}
                </span>
              </td>
              <td class="num">{{ curso.grupos }}</td>
              <td class="acciones">
                <button class="boton boton--sutil" type="button" @click="verGrupos(curso)">
                  Ver grupos
                </button>
                <button
                  class="icono-accion"
                  type="button"
                  aria-label="Editar curso"
                  data-tooltip="Editar curso"
                  @click="editar(curso)"
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
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  class="icono-accion icono-accion--peligro"
                  type="button"
                  :disabled="curso.grupos > 0"
                  :aria-label="curso.grupos > 0 ? 'El curso tiene grupos' : 'Borrar curso'"
                  :data-tooltip="
                    curso.grupos > 0 ? 'Tiene grupos: no se puede borrar' : 'Borrar curso'
                  "
                  @click="cursoABorrar = curso"
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

    <div v-if="editando !== null" class="tarjeta">
      <div class="cabecera-criterios">
        <div class="cabecera-criterios__titulo">
          <h3>Editar curso académico</h3>
          <span class="tenue"> El periodo se mantiene; solo cambia el nombre que se muestra. </span>
        </div>
      </div>

      <p v-if="errorFormulario" class="aviso aviso--error" role="alert">
        {{ errorFormulario }}
      </p>

      <div class="formulario">
        <div class="campo campo--ancho">
          <label for="curso-nombre">Nombre *</label>
          <input id="curso-nombre" v-model="form.nombre" placeholder="2026/2027" maxlength="40" />
        </div>
      </div>

      <div class="barra barra--separada">
        <button class="boton" type="button" @click="cancelarEdicion">Cancelar</button>
        <span class="barra__espacio"></span>
        <button
          class="boton boton--principal"
          type="button"
          :disabled="guardando || !form.nombre.trim()"
          @click="guardar"
        >
          {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </div>

    <Confirmacion
      v-if="cursoABorrar"
      titulo="¿Borrar el curso académico?"
      etiqueta-confirmar="Sí, borrar"
      peligro
      :ocupado="borrando"
      @cancelar="cursoABorrar = null"
      @confirmar="borrar"
    >
      <p>
        Se va a borrar <strong>{{ cursoABorrar.nombre }}</strong
        >.
      </p>
      <p v-if="cursoABorrar.grupos > 0" class="aviso aviso--error">
        También se borrarán sus {{ cursoABorrar.grupos }}
        {{ cursoABorrar.grupos === 1 ? 'grupo' : 'grupos' }} y todos sus datos: alumnado, criterios,
        programación, entregas, notas y evidencias.
      </p>
      <p v-else class="tenue">El curso no tiene grupos.</p>
    </Confirmacion>
  </section>
</template>

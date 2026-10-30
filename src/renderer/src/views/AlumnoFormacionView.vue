<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import type { AlumnoClase, GrupoClase, PeriodoFormacionEmpresa } from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

interface FormFormacion {
  fecha_inicio: string
  fecha_fin: string
  empresa: string
  observaciones: string
}

const route = useRoute()
const store = useGruposClaseStore()

const grupo = ref<GrupoClase | null>(null)
const alumno = ref<AlumnoClase | null>(null)
const periodos = ref<PeriodoFormacionEmpresa[]>([])
const cargando = ref(true)
const guardando = ref(false)
const error = ref<string | null>(null)
const errorFormulario = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const editando = ref<PeriodoFormacionEmpresa | null>(null)
const periodoABorrar = ref<PeriodoFormacionEmpresa | null>(null)
const borrando = ref(false)

const form = reactive<FormFormacion>({
  fecha_inicio: '',
  fecha_fin: '',
  empresa: '',
  observaciones: ''
})

const grupoId = computed(() => Number(route.params.grupoId))
const alumnoId = computed(() => Number(route.params.alumnoId))
const hoy = new Date().toISOString().slice(0, 10)

function isoLocal(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha)
  copia.setDate(copia.getDate() + dias)
  return copia
}

function fechaCorta(fecha: string): string {
  if (!fecha) return '—'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

function duracionDias(periodo: PeriodoFormacionEmpresa): number {
  const inicio = new Date(`${periodo.fecha_inicio}T00:00:00`)
  const fin = new Date(`${periodo.fecha_fin}T00:00:00`)
  return Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 86_400_000) + 1)
}

function estadoPeriodo(periodo: PeriodoFormacionEmpresa): string {
  if (hoy < periodo.fecha_inicio) return 'Próximo'
  if (hoy > periodo.fecha_fin) return 'Finalizado'
  return 'En empresa'
}

const periodoActual = computed(
  () => periodos.value.find((periodo) => estadoPeriodo(periodo) === 'En empresa') ?? null
)

const totalDias = computed(() =>
  periodos.value.reduce((total, periodo) => total + duracionDias(periodo), 0)
)

function resetFormulario(): void {
  editando.value = null
  const inicio = new Date(`${hoy}T00:00:00`)
  form.fecha_inicio = isoLocal(inicio)
  form.fecha_fin = isoLocal(sumarDias(inicio, 14))
  form.empresa = ''
  form.observaciones = ''
  errorFormulario.value = null
}

function editar(periodo: PeriodoFormacionEmpresa): void {
  editando.value = periodo
  form.fecha_inicio = periodo.fecha_inicio
  form.fecha_fin = periodo.fecha_fin
  form.empresa = periodo.empresa
  form.observaciones = periodo.observaciones ?? ''
  errorFormulario.value = null
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
    const alumnos = await window.api.alumnosClase.listar(grupo.value.id)
    alumno.value = alumnos.find((item) => item.id === alumnoId.value) ?? null
    if (!alumno.value) {
      error.value = 'No se ha encontrado el alumno en este grupo.'
      return
    }
    periodos.value = await window.api.formacionEmpresa.listar(grupo.value.id, alumno.value.id)
    resetFormulario()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch([grupoId, alumnoId], cargar)

async function guardar(): Promise<void> {
  if (!grupo.value || !alumno.value) return
  errorFormulario.value = null
  guardando.value = true
  try {
    const entrada = {
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      empresa: form.empresa,
      observaciones: form.observaciones
    }
    if (editando.value) {
      await window.api.formacionEmpresa.actualizar(editando.value.id, entrada)
      mensaje.value = 'Periodo actualizado.'
    } else {
      await window.api.formacionEmpresa.crear(grupo.value.id, alumno.value.id, entrada)
      mensaje.value = 'Periodo añadido.'
    }
    periodos.value = await window.api.formacionEmpresa.listar(grupo.value.id, alumno.value.id)
    resetFormulario()
  } catch (e) {
    errorFormulario.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function borrar(): Promise<void> {
  if (!periodoABorrar.value || !grupo.value || !alumno.value) return
  borrando.value = true
  error.value = null
  try {
    await window.api.formacionEmpresa.borrar(periodoABorrar.value.id)
    periodos.value = await window.api.formacionEmpresa.listar(grupo.value.id, alumno.value.id)
    mensaje.value = 'Periodo borrado.'
    periodoABorrar.value = null
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    borrando.value = false
  }
}
</script>

<template>
  <section class="vista vista--ancha">
    <div v-if="cargando && !alumno" class="vacio">Cargando formación en empresa…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <template v-else-if="alumno && grupo">
      <header class="formacion__cabecera">
        <div>
          <h2>{{ alumno.apellidos }}, {{ alumno.nombre }}</h2>
          <p class="tenue">
            Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }} ·
            {{ alumno.dni ?? 'sin DNI' }} · {{ alumno.email ?? 'sin correo' }}
          </p>
        </div>
        <span v-if="periodoActual" class="chip chip--ok">En empresa ahora</span>
      </header>

      <section class="formacion__resumen">
        <div class="tarjeta">
          <span class="tenue">Periodos</span>
          <strong>{{ periodos.length }}</strong>
        </div>
        <div class="tarjeta">
          <span class="tenue">Días de formación</span>
          <strong>{{ totalDias }}</strong>
        </div>
        <div class="tarjeta">
          <span class="tenue">Empresa actual</span>
          <strong>{{ periodoActual?.empresa ?? '—' }}</strong>
        </div>
      </section>

      <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

      <div class="formacion__layout">
        <section class="tarjeta formacion__lista">
          <header class="entrega-form__seccion-cabecera">
            <div>
              <h3>Periodos de formación</h3>
              <p class="tenue">FCT, formación dual o estancias en empresa.</p>
            </div>
          </header>

          <div v-if="periodos.length === 0" class="vacio">
            Este alumno todavía no tiene periodos de formación en empresa.
          </div>

          <div v-else class="tabla-scroll">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Empresa</th>
                  <th class="num">Días</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                  <th class="acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="periodo in periodos" :key="periodo.id">
                  <td>
                    {{ fechaCorta(periodo.fecha_inicio) }} –
                    {{ fechaCorta(periodo.fecha_fin) }}
                  </td>
                  <td>
                    <strong>{{ periodo.empresa }}</strong>
                  </td>
                  <td class="num">{{ duracionDias(periodo) }}</td>
                  <td>
                    <span
                      class="chip"
                      :class="
                        estadoPeriodo(periodo) === 'En empresa'
                          ? 'chip--ok'
                          : estadoPeriodo(periodo) === 'Finalizado'
                            ? ''
                            : 'chip--aviso'
                      "
                    >
                      {{ estadoPeriodo(periodo) }}
                    </span>
                  </td>
                  <td class="tenue">{{ periodo.observaciones ?? '—' }}</td>
                  <td class="acciones">
                    <button
                      class="icono-accion"
                      type="button"
                      aria-label="Editar periodo"
                      data-tooltip="Editar periodo"
                      @click="editar(periodo)"
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
                      aria-label="Borrar periodo"
                      data-tooltip="Borrar periodo"
                      @click="periodoABorrar = periodo"
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
        </section>

        <aside class="tarjeta formacion__formulario">
          <header class="entrega-form__seccion-cabecera">
            <div>
              <h3>{{ editando ? 'Editar periodo' : 'Añadir periodo' }}</h3>
              <p class="tenue">La empresa es obligatoria.</p>
            </div>
            <span v-if="editando" class="chip chip--aviso">editando</span>
          </header>

          <p v-if="errorFormulario" class="aviso aviso--error" role="alert">
            {{ errorFormulario }}
          </p>

          <form class="formulario" @submit.prevent="guardar">
            <div class="campo">
              <label for="formacion-inicio">Inicio *</label>
              <input id="formacion-inicio" v-model="form.fecha_inicio" type="date" required />
            </div>
            <div class="campo">
              <label for="formacion-fin">Fin *</label>
              <input id="formacion-fin" v-model="form.fecha_fin" type="date" required />
            </div>
            <div class="campo campo--ancho">
              <label for="formacion-empresa">Empresa *</label>
              <input
                id="formacion-empresa"
                v-model="form.empresa"
                placeholder="Nombre de la empresa"
                required
              />
            </div>
            <div class="campo campo--ancho">
              <label for="formacion-observaciones">Observaciones</label>
              <textarea
                id="formacion-observaciones"
                v-model="form.observaciones"
                rows="3"
                placeholder="Tutor, convenio, incidencias…"
              ></textarea>
            </div>
            <div class="formacion__acciones">
              <button
                class="boton boton--principal"
                type="submit"
                :disabled="guardando || !form.empresa.trim()"
              >
                {{ guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Añadir periodo' }}
              </button>
              <button v-if="editando" class="boton" type="button" @click="resetFormulario">
                Cancelar
              </button>
            </div>
          </form>
        </aside>
      </div>

      <Confirmacion
        v-if="periodoABorrar"
        titulo="¿Borrar el periodo?"
        etiqueta-confirmar="Sí, borrar"
        peligro
        :ocupado="borrando"
        @cancelar="periodoABorrar = null"
        @confirmar="borrar"
      >
        <p>
          Se borrará el periodo en <strong>{{ periodoABorrar.empresa }}</strong> del
          {{ fechaCorta(periodoABorrar.fecha_inicio) }} al
          {{ fechaCorta(periodoABorrar.fecha_fin) }}.
        </p>
      </Confirmacion>
    </template>
  </section>
</template>

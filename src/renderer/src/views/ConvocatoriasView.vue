<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import { calcularResumenClase } from '@shared/calcular-calificaciones'
import type {
  AsignacionConvocatoriaEntrada,
  BloqueConvocatoria,
  Convocatoria,
  ConvocatoriaDetalle,
  FilaCalificacionClase,
  GrupoClase,
  ModeloEvaluacion,
  TipoConvocatoria,
  UnidadProgramacion
} from '@shared/tipos'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'

interface FilaAsignacion {
  marcada: boolean
  nota: number | ''
  observaciones: string
}

const props = withDefaults(defineProps<{ embebido?: boolean; tipo?: TipoConvocatoria }>(), {
  embebido: false,
  tipo: 'ordinaria'
})

const route = useRoute()
const store = useGruposClaseStore()

const grupo = ref<GrupoClase | null>(null)
const modelo = ref<ModeloEvaluacion | null>(null)
const unidades = ref<UnidadProgramacion[]>([])
const resumen = ref<ReturnType<typeof calcularResumenClase> | null>(null)
const convocatorias = ref<Convocatoria[]>([])
const detalle = ref<ConvocatoriaDetalle | null>(null)
const seleccionada = ref<number | null>(null)
const cargando = ref(true)
const guardando = ref(false)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const mostrarFormulario = ref(false)
const mostrarBloque = ref(false)
const asignaciones = ref<Record<string, FilaAsignacion>>({})

const crearForm = reactive({
  tipo: 'ordinaria' as 'ordinaria' | 'extraordinaria',
  nombre: '',
  fecha: ''
})

const bloqueForm = reactive({
  nombre: '',
  descripcion: '',
  objetivo: 'global',
  peso: 100
})

const grupoId = computed(() => Number(route.params.grupoId))
const alumnos = computed(() => resumen.value?.alumnos ?? [])
const bloques = computed(() => detalle.value?.bloques ?? [])

const objetivos = computed(() => {
  const lista: {
    value: string
    label: string
    avaluacion?: string
    unidad?: number
    ra?: string
  }[] = [{ value: 'global', label: 'Examen global' }]
  for (const avaluacion of modelo.value?.avaluaciones ?? []) {
    lista.push({
      value: `av:${avaluacion.id}`,
      label: `Trimestre · ${avaluacion.nombre}`,
      avaluacion: avaluacion.id
    })
  }
  for (const unidad of unidades.value) {
    lista.push({
      value: `unidad:${unidad.id}`,
      label: `Unidad · ${unidad.codigo ?? unidad.nombre}`,
      unidad: unidad.id
    })
  }
  for (const ra of alumnos.value[0]?.ras ?? []) {
    lista.push({ value: `ra:${ra.codigo}`, label: `RA · ${ra.codigo}`, ra: ra.codigo })
  }
  return lista
})

const asignacionesGuardadas = computed(() => detalle.value?.asignaciones ?? [])

const notaConvocatoria = (alumnoId: number): number | null => {
  const bloquesConNota = bloques.value
    .map((bloque) => {
      const fila = asignaciones.value[`${alumnoId}:${bloque.id}`]
      if (!fila?.marcada || fila.nota === '') return null
      return { peso: bloque.peso, valor: Number(fila.nota) }
    })
    .filter((item): item is { peso: number; valor: number } => item !== null)
  if (bloquesConNota.length === 0) return null
  const peso = bloquesConNota.reduce((total, item) => total + item.peso, 0)
  if (peso === 0) return null
  const suma = bloquesConNota.reduce((total, item) => total + item.peso * item.valor, 0)
  return Math.round((suma / peso + Number.EPSILON) * 100) / 100
}

function filaAlumno(alumnoId: number): FilaCalificacionClase | undefined {
  return alumnos.value.find((fila) => fila.alumno.id === alumnoId)
}

function requiereBloque(fila: FilaCalificacionClase, bloque: BloqueConvocatoria): boolean {
  if (bloque.avaluacion_id) {
    const trimestre = fila.trimestres.find((item) => item.avaluacionId === bloque.avaluacion_id)
    return (
      Boolean(trimestre?.suspensa) ||
      (trimestre?.nota !== null && trimestre?.nota !== undefined && trimestre.nota < 5)
    )
  }
  if (bloque.unidad_id) {
    const unidad = fila.unidades.find((item) => item.unidadId === bloque.unidad_id)
    return (
      Boolean(unidad?.suspensa) ||
      (unidad?.nota !== null && unidad?.nota !== undefined && unidad.nota < 5)
    )
  }
  if (bloque.ra_codigo) return fila.rasNoSuperados.includes(bloque.ra_codigo)
  return fila.vaAConvocatoria
}

function inicializarAsignaciones(): void {
  const siguiente: Record<string, FilaAsignacion> = {}
  for (const fila of alumnos.value) {
    for (const bloque of bloques.value) {
      const guardada = asignacionesGuardadas.value.find(
        (item) => item.alumno_id === fila.alumno.id && item.bloque_id === bloque.id
      )
      siguiente[`${fila.alumno.id}:${bloque.id}`] = {
        marcada: guardada ? guardada.incluida : requiereBloque(fila, bloque),
        nota: guardada?.nota ?? '',
        observaciones: guardada?.observaciones ?? ''
      }
    }
  }
  asignaciones.value = siguiente
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
    const [
      modeloGrupo,
      listaUnidades,
      entregas,
      listaAlumnos,
      notas,
      criterios,
      listaConvocatorias
    ] = await Promise.all([
      window.api.criterios.obtener(grupo.value.id),
      window.api.unidadesProgramacion.listar(grupo.value.id),
      window.api.entregasClase.listar(grupo.value.id),
      window.api.alumnosClase.listar(grupo.value.id),
      window.api.notasClase.listar(grupo.value.id),
      window.api.entregasClase.criterios(grupo.value.id),
      window.api.convocatorias.listar(grupo.value.id)
    ])
    modelo.value = modeloGrupo
    unidades.value = listaUnidades
    convocatorias.value = props.tipo
      ? listaConvocatorias.filter((convocatoria) => convocatoria.tipo === props.tipo)
      : listaConvocatorias
    resumen.value = modeloGrupo
      ? calcularResumenClase(
          grupo.value,
          modeloGrupo,
          entregas,
          listaAlumnos,
          notas,
          criterios,
          listaUnidades
        )
      : null
    if (props.embebido && convocatorias.value.length === 0) {
      const creada = await window.api.convocatorias.crear(grupo.value.id, {
        tipo: props.tipo,
        nombre:
          props.tipo === 'extraordinaria'
            ? 'Convocatoria extraordinaria'
            : 'Convocatoria ordinaria',
        fecha: null
      })
      await crearBloquesIniciales(creada.id)
      convocatorias.value = [creada]
      seleccionada.value = creada.id
    } else if (seleccionada.value === null && convocatorias.value[0]) {
      seleccionada.value = convocatorias.value[0].id
    }
    await cargarDetalle()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

async function cargarDetalle(): Promise<void> {
  if (seleccionada.value === null) {
    detalle.value = null
    return
  }
  detalle.value = await window.api.convocatorias.obtener(seleccionada.value)
  inicializarAsignaciones()
}

async function crearBloquesIniciales(convocatoriaId: number): Promise<void> {
  for (const [indice, avaluacion] of (modelo.value?.avaluaciones ?? []).entries()) {
    await window.api.convocatorias.crearBloque(convocatoriaId, {
      nombre: `Recuperación ${avaluacion.nombre}`,
      descripcion: `Ejercicios de recuperación de ${avaluacion.nombre}.`,
      avaluacion_id: avaluacion.id,
      peso: avaluacion.peso,
      orden: indice
    })
  }
  await window.api.convocatorias.crearBloque(convocatoriaId, {
    nombre: 'Examen global',
    descripcion: 'Examen global para alumnado con pérdida de evaluación continua o pendientes.',
    peso: 0,
    orden: 99
  })
}

async function crearConvocatoria(): Promise<void> {
  if (!grupo.value || !crearForm.nombre.trim()) return
  guardando.value = true
  error.value = null
  try {
    const convocatoria = await window.api.convocatorias.crear(grupo.value.id, {
      tipo: props.embebido ? props.tipo : crearForm.tipo,
      nombre: crearForm.nombre.trim(),
      fecha: crearForm.fecha || null
    })
    await crearBloquesIniciales(convocatoria.id)
    crearForm.nombre = ''
    crearForm.fecha = ''
    mostrarFormulario.value = false
    await recargarConvocatorias()
    await seleccionar(convocatoria.id)
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function recargarConvocatorias(): Promise<void> {
  if (!grupo.value) return
  const lista = await window.api.convocatorias.listar(grupo.value.id)
  convocatorias.value = props.tipo
    ? lista.filter((convocatoria) => convocatoria.tipo === props.tipo)
    : lista
}

async function seleccionar(id: number): Promise<void> {
  seleccionada.value = id
  await cargarDetalle()
}

async function crearBloque(): Promise<void> {
  if (!detalle.value || !bloqueForm.nombre.trim()) return
  guardando.value = true
  error.value = null
  try {
    const objetivo = objetivos.value.find((item) => item.value === bloqueForm.objetivo)
    await window.api.convocatorias.crearBloque(detalle.value.convocatoria.id, {
      nombre: bloqueForm.nombre.trim(),
      descripcion: bloqueForm.descripcion.trim(),
      avaluacion_id: objetivo?.avaluacion ?? null,
      unidad_id: objetivo?.unidad ?? null,
      ra_codigo: objetivo?.ra ?? null,
      peso: Number(bloqueForm.peso) || 0,
      orden: bloques.value.length
    })
    bloqueForm.nombre = ''
    bloqueForm.descripcion = ''
    mostrarBloque.value = false
    await cargarDetalle()
    mensaje.value = 'Bloque añadido.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function borrarBloque(bloque: BloqueConvocatoria): Promise<void> {
  if (!detalle.value) return
  if (!window.confirm(`¿Borrar el bloque «${bloque.nombre}»?`)) return
  await window.api.convocatorias.borrarBloque(bloque.id)
  await cargarDetalle()
}

async function borrarConvocatoria(): Promise<void> {
  if (!detalle.value) return
  if (!window.confirm(`¿Borrar la convocatoria «${detalle.value.convocatoria.nombre}»?`)) return
  await window.api.convocatorias.borrar(detalle.value.convocatoria.id)
  seleccionada.value = null
  detalle.value = null
  await recargarConvocatorias()
}

async function guardarAsignaciones(): Promise<void> {
  if (!detalle.value) return
  guardando.value = true
  error.value = null
  try {
    const lista: AsignacionConvocatoriaEntrada[] = []
    for (const fila of alumnos.value) {
      for (const bloque of bloques.value) {
        const valor = asignaciones.value[`${fila.alumno.id}:${bloque.id}`]
        if (!valor) continue
        lista.push({
          alumnoId: fila.alumno.id,
          bloqueId: bloque.id,
          nota: valor.nota === '' ? null : Number(valor.nota),
          observaciones: valor.observaciones.trim() || null,
          incluida: valor.marcada
        })
      }
    }
    detalle.value = await window.api.convocatorias.guardarAsignaciones(
      detalle.value.convocatoria.id,
      lista
    )
    inicializarAsignaciones()
    mensaje.value = 'Asignaciones y notas guardadas.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

function etiquetaObjetivo(bloque: BloqueConvocatoria): string {
  if (bloque.avaluacion_id) {
    return (
      modelo.value?.avaluaciones.find((item) => item.id === bloque.avaluacion_id)?.nombre ??
      bloque.avaluacion_id
    )
  }
  if (bloque.unidad_id) {
    const unidad = unidades.value.find((item) => item.id === bloque.unidad_id)
    return unidad ? `Unidad ${unidad.codigo ?? unidad.nombre}` : `Unidad ${bloque.unidad_id}`
  }
  if (bloque.ra_codigo) return `RA ${bloque.ra_codigo}`
  return 'Global'
}

function verExamen(alumnoId: number): void {
  const fila = filaAlumno(alumnoId)
  if (!fila || !detalle.value) return
  const asignados = bloques.value.filter(
    (bloque) => asignaciones.value[`${alumnoId}:${bloque.id}`]?.marcada
  )
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Examen · ${fila.alumno.apellidos}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1e293b;max-width:900px;margin:30px auto;line-height:1.5}h1{font-size:22px} .bloque{border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:12px 0} .bloque h2{font-size:16px;margin:0 0 6px} .linea{border-bottom:1px solid #cbd5e1;height:22px;margin-top:10px}</style></head><body><h1>${detalle.value.convocatoria.nombre}</h1><p><strong>Alumno/a:</strong> ${fila.alumno.apellidos}, ${fila.alumno.nombre} · <strong>Fecha:</strong> ${detalle.value.convocatoria.fecha ?? '—'}</p>${asignados
    .map(
      (bloque) =>
        `<div class="bloque"><h2>${bloque.nombre}</h2><p>${bloque.descripcion || ''}</p><div class="linea"></div><div class="linea"></div><div class="linea"></div></div>`
    )
    .join('')}</body></html>`
  const ventana = window.open('', '_blank', 'width=980,height=900')
  if (!ventana) return
  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
}

onMounted(() => {
  crearForm.tipo = props.tipo
  void cargar()
})
watch(grupoId, cargar)
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver
      :a="grupo ? { name: 'calificaciones', params: { grupoId: grupo.id } } : '/grupos'"
    />

    <header class="vista__cabecera">
      <h2>Convocatorias</h2>
      <p v-if="grupo" class="tenue">
        Curso {{ grupo.curso_academico_nombre }} · {{ grupo.nombre }} · ordinaria y extraordinaria
      </p>
    </header>

    <div v-if="cargando" class="vacio">Cargando convocatorias…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

    <template v-else-if="grupo && modelo">
      <div v-if="!embebido" class="barra">
        <button class="boton boton--principal" type="button" @click="mostrarFormulario = true">
          Nueva convocatoria
        </button>
        <span class="tenue">{{ convocatorias.length }} convocatoria(s)</span>
      </div>

      <section v-if="mostrarFormulario && !embebido" class="tarjeta">
        <div class="cabecera-criterios">
          <div class="cabecera-criterios__titulo">
            <h3>Nueva convocatoria</h3>
            <span class="tenue"
              >Se crearán bloques de recuperación por trimestre y un examen global.</span
            >
          </div>
        </div>
        <div class="formulario">
          <div v-if="!embebido" class="campo">
            <label for="convocatoria-tipo">Tipo</label>
            <select id="convocatoria-tipo" v-model="crearForm.tipo">
              <option value="ordinaria">Ordinaria</option>
              <option value="extraordinaria">Extraordinaria</option>
            </select>
          </div>
          <div class="campo">
            <label for="convocatoria-nombre">Nombre *</label>
            <input
              id="convocatoria-nombre"
              v-model="crearForm.nombre"
              placeholder="Ordinaria 2027"
            />
          </div>
          <div class="campo">
            <label for="convocatoria-fecha">Fecha</label>
            <input id="convocatoria-fecha" v-model="crearForm.fecha" type="date" />
          </div>
        </div>
        <div class="criterios__pie-fila">
          <button class="boton" type="button" @click="mostrarFormulario = false">Cancelar</button>
          <span class="barra__espacio"></span>
          <button
            class="boton boton--principal"
            type="button"
            :disabled="guardando"
            @click="crearConvocatoria"
          >
            Crear convocatoria
          </button>
        </div>
      </section>

      <div class="convocatorias__layout" :class="{ 'convocatorias__layout--embebido': embebido }">
        <aside v-if="!embebido" class="tarjeta convocatorias__lista">
          <h3>Convocatorias</h3>
          <button
            v-for="convocatoria in convocatorias"
            :key="convocatoria.id"
            class="convocatorias__item"
            :class="{ 'convocatorias__item--activa': seleccionada === convocatoria.id }"
            type="button"
            @click="seleccionar(convocatoria.id)"
          >
            <strong>{{ convocatoria.nombre }}</strong>
            <span class="tenue"
              >{{ convocatoria.tipo }} · {{ convocatoria.fecha ?? 'sin fecha' }}</span
            >
          </button>
          <p v-if="convocatorias.length === 0" class="tenue">Todavía no hay convocatorias.</p>
        </aside>

        <div v-if="detalle" class="convocatorias__principal">
          <section class="tarjeta">
            <header class="cabecera-criterios">
              <div class="cabecera-criterios__titulo">
                <h3>{{ detalle.convocatoria.nombre }}</h3>
                <span class="tenue">
                  {{ detalle.convocatoria.tipo }} · {{ detalle.convocatoria.fecha ?? 'sin fecha' }}
                </span>
              </div>
              <div v-if="!embebido" class="cabecera-criterios__acciones">
                <button class="boton boton--peligro" type="button" @click="borrarConvocatoria">
                  Borrar
                </button>
              </div>
            </header>

            <div class="barra">
              <button class="boton boton--sutil" type="button" @click="mostrarBloque = true">
                Añadir bloque
              </button>
            </div>

            <form v-if="mostrarBloque" class="formulario" @submit.prevent="crearBloque">
              <div class="campo">
                <label for="bloque-nombre">Nombre *</label>
                <input
                  id="bloque-nombre"
                  v-model="bloqueForm.nombre"
                  placeholder="Ejercicio de recuperación"
                />
              </div>
              <div class="campo">
                <label for="bloque-objetivo">Vinculado a</label>
                <select id="bloque-objetivo" v-model="bloqueForm.objetivo">
                  <option
                    v-for="objetivo in objetivos"
                    :key="objetivo.value"
                    :value="objetivo.value"
                  >
                    {{ objetivo.label }}
                  </option>
                </select>
              </div>
              <div class="campo">
                <label for="bloque-peso">Peso (%)</label>
                <input
                  id="bloque-peso"
                  v-model.number="bloqueForm.peso"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div class="campo campo--ancho">
                <label for="bloque-descripcion">Descripción</label>
                <textarea
                  id="bloque-descripcion"
                  v-model="bloqueForm.descripcion"
                  rows="2"
                ></textarea>
              </div>
              <div class="criterios__pie-fila">
                <button class="boton" type="button" @click="mostrarBloque = false">Cancelar</button>
                <span class="barra__espacio"></span>
                <button class="boton boton--principal" type="submit">Añadir bloque</button>
              </div>
            </form>

            <div class="tabla-scroll">
              <table class="tabla tabla--compacta">
                <thead>
                  <tr>
                    <th>Bloque</th>
                    <th>Vinculado a</th>
                    <th class="num">Peso</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bloque in bloques" :key="bloque.id">
                    <td>
                      <strong>{{ bloque.nombre }}</strong
                      ><span v-if="bloque.descripcion" class="tenue">{{ bloque.descripcion }}</span>
                    </td>
                    <td>{{ etiquetaObjetivo(bloque) }}</td>
                    <td class="num">{{ bloque.peso }} %</td>
                    <td class="acciones">
                      <button
                        class="boton boton--sutil"
                        type="button"
                        @click="borrarBloque(bloque)"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="tarjeta">
            <header class="cabecera-criterios">
              <div class="cabecera-criterios__titulo">
                <h3>Alumnado y notas de la convocatoria</h3>
                <span class="tenue"
                  >Marca los bloques que debe realizar cada alumno e introduce su nota.</span
                >
              </div>
              <div class="cabecera-criterios__acciones">
                <button
                  class="boton boton--principal"
                  type="button"
                  :disabled="guardando"
                  @click="guardarAsignaciones"
                >
                  {{ guardando ? 'Guardando…' : 'Guardar asignaciones' }}
                </button>
              </div>
            </header>

            <div class="tabla-scroll">
              <table class="tabla convocatorias__alumnos">
                <thead>
                  <tr>
                    <th>Alumno/a</th>
                    <th v-for="bloque in bloques" :key="bloque.id" class="num">
                      {{ bloque.nombre }}<br /><span class="tenue">{{ bloque.peso }} %</span>
                    </th>
                    <th class="num">Nota conv.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fila in alumnos" :key="fila.alumno.id">
                    <td>
                      <strong>{{ fila.alumno.apellidos }}, {{ fila.alumno.nombre }}</strong>
                    </td>
                    <td v-for="bloque in bloques" :key="bloque.id" class="num">
                      <label class="convocatorias__celda">
                        <input
                          v-model="asignaciones[`${fila.alumno.id}:${bloque.id}`].marcada"
                          type="checkbox"
                          :aria-label="`Asignar ${bloque.nombre}`"
                        />
                        <input
                          v-model="asignaciones[`${fila.alumno.id}:${bloque.id}`].nota"
                          type="number"
                          min="0"
                          max="10"
                          step="0.01"
                          :disabled="!asignaciones[`${fila.alumno.id}:${bloque.id}`].marcada"
                          class="convocatorias__nota"
                          aria-label="Nota del bloque"
                        />
                      </label>
                    </td>
                    <td class="num">
                      <strong>{{ notaConvocatoria(fila.alumno.id) ?? '—' }}</strong>
                    </td>
                    <td>
                      <button
                        class="boton boton--sutil"
                        type="button"
                        @click="verExamen(fila.alumno.id)"
                      >
                        Examen
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </template>
  </section>
</template>

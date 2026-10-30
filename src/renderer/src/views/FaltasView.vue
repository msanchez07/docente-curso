<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import { extraerFaltasPdf } from '@renderer/utils/faltas-pdf'
import { useGruposClaseStore } from '@renderer/stores/grupos-clase'
import type {
  AlumnoFaltasCurso,
  ClaveCursoFaltas,
  ConfigModuloFaltas,
  CursoFaltasResumen,
  DatosCursoFaltas,
  InformeFaltas,
  InformeFaltasResumen
} from '@shared/tipos'

const route = useRoute()
const store = useGruposClaseStore()

const cohortes = ref<CursoFaltasResumen[]>([])
const seleccion = ref(0)
const curso = ref<DatosCursoFaltas | null>(null)
const modulos = ref<ConfigModuloFaltas[]>([])
const informes = ref<InformeFaltasResumen[]>([])
const informe = ref<InformeFaltas | null>(null)
const limite = ref(15)
const incluirJustificadas = ref(false)
const cargando = ref(true)
const trabajando = ref(false)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const ficheroPdf = ref<HTMLInputElement | null>(null)
const clave = ref<ClaveCursoFaltas | null>(null)
const nombreCurso = computed(() => cohortes.value[seleccion.value]?.nombre ?? '')

const alumnosPorId = computed(() => {
  const mapa = new Map<number, AlumnoFaltasCurso>()
  for (const alumno of curso.value?.alumnos ?? []) mapa.set(alumno.id, alumno)
  return mapa
})

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function nombreAlumno(id: number): string {
  const alumno = alumnosPorId.value.get(id)
  return alumno ? `${alumno.apellidos}, ${alumno.nombre}` : `Alumno ${id}`
}

function faltasDe(alumnoId: number, grupoId: number): number {
  const alumno = informe.value?.datos.alumnos.find((fila) => fila.alumnoId === alumnoId)
  return Number(alumno?.faltas[String(grupoId)] ?? 0)
}

function porcentaje(faltas: number, modulo: ConfigModuloFaltas): number {
  if (modulo.horas <= 0) return 0
  return Math.round((faltas / modulo.horas) * 100)
}

function estado(faltas: number, modulo: ConfigModuloFaltas): string {
  const valor = porcentaje(faltas, modulo)
  if (valor >= (informe.value?.datos.limite ?? limite.value)) return 'faltas__estado--peligro'
  if (valor >= (informe.value?.datos.limite ?? limite.value) * 0.66) return 'faltas__estado--aviso'
  if (valor >= (informe.value?.datos.limite ?? limite.value) * 0.33)
    return 'faltas__estado--proximo'
  return 'faltas__estado--ok'
}

function textoEstado(faltas: number, modulo: ConfigModuloFaltas): string {
  const clase = estado(faltas, modulo)
  if (clase === 'faltas__estado--peligro') return 'Pérdida'
  if (clase === 'faltas__estado--aviso') return 'Riesgo'
  if (clase === 'faltas__estado--proximo') return 'Aviso'
  return faltas > 0 ? 'Correcto' : 'Sin faltas'
}

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '—'
  const [dia, hora] = fecha.split(' ')
  const [anio, mes, numero] = dia.split('-')
  return `${numero}/${mes}/${anio}${hora ? ` · ${hora.slice(0, 5)}` : ''}`
}

function claveDe(cohorte: CursoFaltasResumen): ClaveCursoFaltas {
  return {
    cursoAcademicoId: cohorte.cursoAcademicoId,
    cicloId: cohorte.cicloId,
    curso: cohorte.curso,
    modalidad: cohorte.modalidad
  }
}

async function cargarCohorte(): Promise<void> {
  const cohorte = cohortes.value[seleccion.value]
  if (!cohorte) return
  clave.value = claveDe(cohorte)
  const datos = await window.api.faltas.obtenerCurso(clave.value)
  curso.value = datos
  modulos.value = datos.modulos.map((modulo) => ({ ...modulo }))
  limite.value = datos.limite
  incluirJustificadas.value = datos.incluirJustificadas
  informes.value = await window.api.faltas.listarInformes(clave.value)
  if (informes.value.length > 0) {
    await verInforme(informes.value[0].id)
  } else {
    informe.value = null
  }
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    await store.cargar()
    cohortes.value = await window.api.faltas.cursos()
    const grupoId = Number(route.query.grupo)
    if (Number.isFinite(grupoId) && grupoId > 0) {
      const grupo = store.grupo(grupoId)
      const indice = cohortes.value.findIndex(
        (cohorte) =>
          cohorte.cursoAcademicoId === grupo?.curso_academico_id &&
          cohorte.cicloId === grupo?.ciclo_id &&
          cohorte.curso === grupo?.curso &&
          cohorte.modalidad === grupo?.modalidad
      )
      if (indice >= 0) seleccion.value = indice
    }
    if (cohortes.value.length === 0) {
      error.value = 'Todavía no hay grupos de clase para este curso académico.'
      return
    }
    await cargarCohorte()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

async function verInforme(id: number): Promise<void> {
  informe.value = await window.api.faltas.obtenerInforme(id)
}

async function guardarConfiguracion(): Promise<void> {
  if (!clave.value) return
  trabajando.value = true
  error.value = null
  mensaje.value = null
  try {
    for (const modulo of modulos.value) {
      await window.api.faltas.guardarModulo(modulo.grupoId, modulo.nombreInforme, modulo.horas)
    }
    await window.api.faltas.guardarAjustes(clave.value, limite.value, incluirJustificadas.value)
    mensaje.value = 'Configuración de faltas guardada.'
    await cargarCohorte()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    trabajando.value = false
  }
}

function elegirPdf(): void {
  ficheroPdf.value?.click()
}

async function alElegirPdf(evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement
  const archivo = entrada.files?.[0]
  if (!archivo || !clave.value || !curso.value) return
  trabajando.value = true
  error.value = null
  mensaje.value = null
  try {
    const filasPdf = await extraerFaltasPdf(archivo, incluirJustificadas.value)
    if (filasPdf.length === 0) {
      error.value = 'No se ha podido leer alumnado del PDF.'
      return
    }
    const faltas = new Map<string, Record<string, number>>()
    const modulosSinCoincidencia: string[] = []

    for (const modulo of modulos.value) {
      const clavePdf = [...Object.keys(filasPdf[0].modulos)].find(
        (nombre) => normalizar(nombre) === normalizar(modulo.nombreInforme)
      )
      if (!clavePdf) modulosSinCoincidencia.push(modulo.nombreInforme)
    }

    for (const alumno of curso.value.alumnos) {
      const buscado = normalizar(`${alumno.nombre} ${alumno.apellidos}`)
      const filaPdf = filasPdf.find((fila) => normalizar(fila.nombre) === buscado)
      const valores: Record<string, number> = {}
      for (const modulo of modulos.value) {
        const nombrePdf = [...Object.keys(filasPdf[0].modulos)].find(
          (nombre) => normalizar(nombre) === normalizar(modulo.nombreInforme)
        )
        valores[String(modulo.grupoId)] = nombrePdf ? (filaPdf?.modulos[nombrePdf] ?? 0) : 0
      }
      faltas.set(String(alumno.id), valores)
    }

    const datos = {
      modulos: modulos.value,
      alumnos: curso.value.alumnos.map((alumno) => ({
        alumnoId: alumno.id,
        faltas: faltas.get(String(alumno.id)) ?? {}
      })),
      limite: limite.value,
      incluirJustificadas: incluirJustificadas.value
    }
    await window.api.faltas.importarInforme(clave.value, archivo.name, datos)
    await cargarCohorte()
    mensaje.value = `Informe «${archivo.name}» añadido al historial.`
    if (modulosSinCoincidencia.length > 0) {
      error.value = `No se han encontrado estas columnas en el PDF: ${modulosSinCoincidencia.join(', ')}. Revisa el nombre exacto de cada módulo.`
    }
    if (modulos.value.length === 0) {
      error.value = 'Configura el nombre exacto de los módulos antes de importar.'
    }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    trabajando.value = false
    entrada.value = ''
  }
}

function imprimir(): void {
  if (!curso.value || !informe.value) return
  const modulos = informe.value.datos.modulos
  const cabeceras = modulos.map((modulo) => `<th colspan="2">${modulo.nombreInforme}</th>`).join('')
  const subcabeceras = modulos.map(() => '<th>Faltas</th><th>%</th>').join('')
  const filas = informe.value.datos.alumnos
    .map((alumno) => {
      const celdas = modulos
        .map((modulo) => {
          const faltas = Number(alumno.faltas[String(modulo.grupoId)] ?? 0)
          return `<td>${faltas}</td><td>${porcentaje(faltas, modulo)} %</td>`
        })
        .join('')
      return `<tr><td>${nombreAlumno(alumno.alumnoId)}</td>${celdas}</tr>`
    })
    .join('')
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Faltas · ${nombreCurso.value}</title>
  <style>@page{size:A4 landscape;margin:12mm}body{font:10px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d2939}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 10px;color:#667085}table{width:100%;border-collapse:collapse}th,td{padding:5px;border:1px solid #dbe5ee;text-align:center}th{background:#eef4f8;color:#36536b;font-size:8px;text-transform:uppercase}td:first-child{text-align:left;font-weight:600}</style></head><body>
  <h1>Control de faltas</h1><p>${nombreCurso.value} · ${curso.value.cursoAcademicoNombre} · ${informe.value.archivo} · límite ${informe.value.datos.limite} %</p>
  <table><thead><tr><th rowspan="2">Alumno/a</th>${cabeceras}</tr><tr>${subcabeceras}</tr></thead><tbody>${filas}</tbody></table>
  </body></html>`
  const ventana = window.open('', 'faltas-impresion', 'width=1100,height=800')
  if (!ventana) return
  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
  window.setTimeout(() => ventana.print(), 250)
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver a="/grupos" />

    <header class="vista__cabecera">
      <h2>Control de faltas</h2>
      <p class="tenue">
        Informe de tutoría por curso: todos los módulos, alumnado y evolución de los PDF subidos.
      </p>
    </header>

    <div v-if="cargando" class="vacio">Cargando faltas…</div>
    <p v-else-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

    <template v-if="!cargando && cohortes.length > 0">
      <section class="tarjeta faltas__selector">
        <label for="faltas-curso">Curso / tutoría</label>
        <select
          id="faltas-curso"
          v-model.number="seleccion"
          :disabled="trabajando"
          @change="cargarCohorte"
        >
          <option v-for="(cohorte, indice) in cohortes" :key="indice" :value="indice">
            {{ cohorte.nombre }} · {{ cohorte.cursoAcademicoNombre }} ·
            {{ plural(cohorte.modulos, 'módulo', 'módulos') }} ·
            {{ plural(cohorte.alumnos, 'alumno', 'alumnos') }}
          </option>
        </select>
      </section>

      <template v-if="curso">
        <section class="tarjeta">
          <header class="dashboard__tarjeta-cabecera">
            <div>
              <h3>Módulos del curso</h3>
              <p class="tenue">
                El nombre debe coincidir exactamente con la columna del PDF de ITACA.
              </p>
            </div>
            <button
              class="boton boton--principal"
              type="button"
              :disabled="trabajando"
              @click="guardarConfiguracion"
            >
              {{ trabajando ? 'Guardando…' : 'Guardar configuración' }}
            </button>
          </header>

          <div class="formulario">
            <div class="campo">
              <label for="faltas-limite">Límite de faltas (%)</label>
              <input id="faltas-limite" v-model.number="limite" type="number" min="1" max="100" />
            </div>
            <div class="campo faltas__check">
              <label>
                <input v-model="incluirJustificadas" type="checkbox" />
                Contar faltas justificadas
              </label>
            </div>
          </div>

          <div class="tabla-scroll">
            <table class="tabla faltas__modulos">
              <thead>
                <tr>
                  <th>Módulo</th>
                  <th>Nombre exacto en el informe</th>
                  <th class="num">Horas</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="modulo in modulos" :key="modulo.grupoId">
                  <td>
                    <strong>{{ modulo.nombre }}</strong>
                    <span class="tenue monospace">{{ modulo.moduloCodigo }}</span>
                  </td>
                  <td>
                    <input v-model="modulo.nombreInforme" class="faltas__nombre" />
                  </td>
                  <td class="num">
                    <input
                      v-model.number="modulo.horas"
                      class="faltas__horas"
                      type="number"
                      min="1"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div class="faltas__layout">
          <section class="tarjeta faltas__historial">
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Historial de informes</h3>
                <p class="tenue">Cada PDF subido queda guardado como una instantánea.</p>
              </div>
              <button
                class="boton boton--principal"
                type="button"
                :disabled="trabajando"
                @click="elegirPdf"
              >
                {{ trabajando ? 'Leyendo…' : 'Subir PDF' }}
              </button>
              <input
                ref="ficheroPdf"
                class="visualmente-oculto"
                type="file"
                accept=".pdf,application/pdf"
                @change="alElegirPdf"
              />
            </header>

            <p v-if="informes.length === 0" class="tenue">
              Todavía no hay informes. Sube el PDF de faltas de ITACA para empezar el historial.
            </p>
            <ul v-else class="faltas__historial-lista">
              <li v-for="item in informes" :key="item.id">
                <button
                  type="button"
                  class="faltas__historial-item"
                  :class="{ 'faltas__historial-item--activo': informe?.id === item.id }"
                  @click="verInforme(item.id)"
                >
                  <strong>{{ item.archivo }}</strong>
                  <span>{{ formatearFecha(item.subidoEn) }}</span>
                  <span class="tenue"
                    >{{ plural(item.totalAlumnos, 'alumno', 'alumnos') }} ·
                    {{ plural(item.totalModulos, 'módulo', 'módulos') }}</span
                  >
                </button>
              </li>
            </ul>
          </section>

          <section class="tarjeta faltas__panel">
            <header class="dashboard__tarjeta-cabecera">
              <div>
                <h3>Informe seleccionado</h3>
                <p class="tenue">
                  {{
                    informe
                      ? `${informe.archivo} · ${formatearFecha(informe.subidoEn)}`
                      : 'Selecciona un informe del historial.'
                  }}
                </p>
              </div>
              <button class="boton" type="button" :disabled="!informe" @click="imprimir">
                Imprimir / PDF
              </button>
            </header>

            <p v-if="!informe" class="tenue">No hay ningún informe seleccionado.</p>
            <div v-else class="tabla-scroll">
              <table class="tabla faltas__tabla">
                <thead>
                  <tr>
                    <th rowspan="2">Alumno/a</th>
                    <th
                      v-for="modulo in informe.datos.modulos"
                      :key="modulo.grupoId"
                      colspan="2"
                      class="faltas__modulo-cabecera"
                    >
                      {{ modulo.nombreInforme }}
                    </th>
                  </tr>
                  <tr>
                    <template
                      v-for="modulo in informe.datos.modulos"
                      :key="`sub-${modulo.grupoId}`"
                    >
                      <th class="num">Faltas</th>
                      <th class="num">%</th>
                    </template>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="alumno in informe.datos.alumnos" :key="alumno.alumnoId">
                    <td>
                      <strong>{{ nombreAlumno(alumno.alumnoId) }}</strong>
                    </td>
                    <template
                      v-for="modulo in informe.datos.modulos"
                      :key="`${alumno.alumnoId}-${modulo.grupoId}`"
                    >
                      <td class="num">{{ faltasDe(alumno.alumnoId, modulo.grupoId) }}</td>
                      <td class="num">
                        <span
                          class="chip faltas__estado"
                          :class="estado(faltasDe(alumno.alumnoId, modulo.grupoId), modulo)"
                          :title="textoEstado(faltasDe(alumno.alumnoId, modulo.grupoId), modulo)"
                        >
                          {{ porcentaje(faltasDe(alumno.alumnoId, modulo.grupoId), modulo) }} %
                        </span>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </template>
    </template>
  </section>
</template>

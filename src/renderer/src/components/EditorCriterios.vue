<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Pestanas from '@renderer/components/Pestanas.vue'
import type { ModeloEvaluacion } from '@shared/tipos'

const props = defineProps<{ modelo: ModeloEvaluacion }>()
const emit = defineEmits<{ valido: [boolean] }>()

if (!props.modelo.modoCalificacion) props.modelo.modoCalificacion = 'trimestres'

const pestana = ref('avaluaciones')
const pestanas = [
  { id: 'avaluaciones', etiqueta: 'Avaluaciones' },
  { id: 'categorias', etiqueta: 'Categorías' },
  { id: 'minimos', etiqueta: 'Mínimos' },
  { id: 'resumen', etiqueta: 'Resumen' }
]

const sumaCategorias = computed(() =>
  props.modelo.categorias.reduce((total, c) => total + (Number(c.peso) || 0), 0)
)
const sumaAvaluaciones = computed(() =>
  props.modelo.avaluaciones.reduce((total, a) => total + (Number(a.peso) || 0), 0)
)

function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

const categoriasOk = computed(() => Math.abs(redondear2(sumaCategorias.value) - 100) < 1e-9)
const avaluacionesOk = computed(() => Math.abs(redondear2(sumaAvaluaciones.value) - 100) < 1e-9)
const nombresOk = computed(
  () =>
    props.modelo.categorias.every((c) => c.nombre.trim().length > 0) &&
    props.modelo.avaluaciones.every((a) => a.nombre.trim().length > 0)
)
const valido = computed(
  () =>
    props.modelo.categorias.length > 0 &&
    props.modelo.avaluaciones.length > 0 &&
    categoriasOk.value &&
    avaluacionesOk.value &&
    nombresOk.value
)

function porcentaje(valor: number): string {
  return redondear2(valor).toLocaleString('es-ES', { maximumFractionDigits: 2 })
}

watch(valido, (nuevo) => emit('valido', nuevo), { immediate: true })

const formulaAvaluacion = computed(() => {
  const categorias = props.modelo.categorias.filter((c) => Number(c.peso) > 0)
  return categorias.length === 0
    ? '—'
    : categorias.map((c) => `${c.peso} % ${c.nombre}`).join(' + ')
})

const formulaFinal = computed(() => {
  const avaluaciones = props.modelo.avaluaciones.filter((a) => Number(a.peso) > 0)
  return avaluaciones.length === 0
    ? '—'
    : avaluaciones.map((a) => `${a.peso} % ${a.nombre}`).join(' + ')
})

function idDesde(base: string, existentes: string[]): string {
  let id = base
  let n = 2
  while (existentes.includes(id)) id = `${base}_${n++}`
  return id
}

function anadirAvaluacion(): void {
  const ids = props.modelo.avaluaciones.map((a) => a.id)
  const numero = props.modelo.avaluaciones.length + 1
  props.modelo.avaluaciones.push({
    id: idDesde(`AV${numero}`, ids),
    nombre: `${numero}ª evaluación`,
    peso: 0
  })
}

function quitarAvaluacion(indice: number): void {
  props.modelo.avaluaciones.splice(indice, 1)
}

function anadirCategoria(): void {
  const ids = props.modelo.categorias.map((c) => c.id)
  props.modelo.categorias.push({
    id: idDesde('categoria', ids),
    nombre: 'Nueva categoría',
    peso: 0
  })
}

function quitarCategoria(indice: number): void {
  props.modelo.categorias.splice(indice, 1)
}
</script>

<template>
  <div class="criterios">
    <div class="criterios__modo">
      <span class="campo__etiqueta">Modo de calificación</span>
      <label class="criterios__modo-opcion">
        <input v-model="modelo.modoCalificacion" type="radio" value="trimestres" />
        Por trimestres
      </label>
      <label class="criterios__modo-opcion">
        <input v-model="modelo.modoCalificacion" type="radio" value="unidades" />
        Por unidades didácticas
      </label>
      <span class="tenue">
        {{
          modelo.modoCalificacion === 'unidades'
            ? 'La nota final se calcula con el peso de cada unidad y sus entregas.'
            : 'La nota final se calcula con las evaluaciones y categorías actuales.'
        }}
      </span>
    </div>

    <p
      v-if="!categoriasOk || !avaluacionesOk || !nombresOk"
      class="aviso aviso--error"
      role="alert"
    >
      <template v-if="!avaluacionesOk">
        Los pesos de las avaluaciones suman {{ porcentaje(sumaAvaluaciones) }} %; deben sumar
        exactamente 100 %.
      </template>
      <template v-if="!categoriasOk">
        Los pesos de las categorías suman {{ porcentaje(sumaCategorias) }} %; deben sumar
        exactamente 100 %.
      </template>
      <template v-if="!nombresOk">Los nombres no pueden estar vacíos.</template>
    </p>

    <div class="criterios__layout">
      <aside class="tarjeta criterios__indice" aria-label="Secciones de criterios">
        <span class="criterios__indice-titulo">Secciones</span>
        <Pestanas v-model="pestana" :pestanas="pestanas" />
      </aside>

      <section class="tarjeta criterios__detalle">
        <div
          v-if="pestana === 'avaluaciones'"
          id="panel-avaluaciones"
          role="tabpanel"
          aria-labelledby="pestana-avaluaciones"
          tabindex="0"
        >
          <p class="tenue">Cada avaluación pesa en la nota final. La suma debe ser 100 %.</p>
          <table class="tabla">
            <thead>
              <tr>
                <th>Avaluación</th>
                <th class="num">Peso</th>
                <th class="acciones"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(avaluacion, indice) in modelo.avaluaciones" :key="avaluacion.id">
                <td><input v-model="avaluacion.nombre" type="text" /></td>
                <td class="num">
                  <input
                    v-model.number="avaluacion.peso"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </td>
                <td class="acciones">
                  <button
                    class="icono-accion icono-accion--peligro"
                    type="button"
                    aria-label="Quitar avaluación"
                    data-tooltip="Quitar avaluación"
                    @click="quitarAvaluacion(indice)"
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
          <div class="criterios__pie-fila">
            <button class="boton boton--sutil" type="button" @click="anadirAvaluacion">
              Añadir avaluación
            </button>
            <span class="barra__espacio"></span>
            <span class="chip" :class="avaluacionesOk ? 'chip--ok' : 'chip--aviso'">
              Suma: {{ porcentaje(sumaAvaluaciones) }} %
            </span>
          </div>
        </div>

        <div
          v-else-if="pestana === 'categorias'"
          id="panel-categorias"
          role="tabpanel"
          aria-labelledby="pestana-categorias"
          tabindex="0"
        >
          <p class="tenue">
            Categorías de entrega. Los mismos pesos se aplican a las tres avaluaciones; si una
            categoría no tiene entregas, su peso se reparte entre las demás.
          </p>
          <table class="tabla">
            <thead>
              <tr>
                <th>Categoría</th>
                <th class="num">Peso</th>
                <th class="acciones"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(categoria, indice) in modelo.categorias" :key="categoria.id">
                <td><input v-model="categoria.nombre" type="text" /></td>
                <td class="num">
                  <input
                    v-model.number="categoria.peso"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </td>
                <td class="acciones">
                  <button
                    class="icono-accion icono-accion--peligro"
                    type="button"
                    aria-label="Quitar categoría"
                    data-tooltip="Quitar categoría"
                    @click="quitarCategoria(indice)"
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
          <div class="criterios__pie-fila">
            <button class="boton boton--sutil" type="button" @click="anadirCategoria">
              Añadir categoría
            </button>
            <span class="barra__espacio"></span>
            <span class="chip" :class="categoriasOk ? 'chip--ok' : 'chip--aviso'">
              Suma: {{ porcentaje(sumaCategorias) }} %
            </span>
          </div>
        </div>

        <div
          v-else-if="pestana === 'minimos'"
          id="panel-minimos"
          role="tabpanel"
          aria-labelledby="pestana-minimos"
          tabindex="0"
        >
          <p class="tenue">
            Los mínimos son bloqueantes: si no se cumplen, la categoría, la avaluación o el módulo
            quedan suspensos.
          </p>
          <div class="criterios__minimos">
            <div v-for="requisito in modelo.requisitos" :key="requisito.id" class="requisito-fila">
              <div>
                <strong>{{ requisito.nombre }}</strong>
                <p class="tenue">{{ requisito.descripcion }}</p>
              </div>
              <input v-model.number="requisito.valor" type="number" min="0" max="10" step="0.1" />
            </div>
          </div>
        </div>

        <div
          v-else
          id="panel-resumen"
          role="tabpanel"
          aria-labelledby="pestana-resumen"
          tabindex="0"
        >
          <div class="formula">
            <p class="formula__linea">
              <span class="formula__etiqueta">Nota de avaluación</span>
              <span class="formula__valor">{{ formulaAvaluacion }}</span>
            </p>
            <p class="formula__linea">
              <span class="formula__etiqueta">Nota final</span>
              <span class="formula__valor">{{ formulaFinal }}</span>
            </p>
          </div>

          <div class="criterios__bloque">
            <h4>Mínimos</h4>
            <ul class="criterios__lista">
              <li v-for="requisito in modelo.requisitos" :key="requisito.id">
                {{ requisito.nombre }}: <strong>{{ requisito.valor }}</strong>
              </li>
            </ul>
          </div>

          <div class="criterios__bloque">
            <h4>Convocatorias</h4>
            <p class="tenue">
              <strong>Extraordinaria:</strong> se recuperan solo las avaluaciones suspensas; las
              aprobadas se mantienen.<br />
              <strong>Pérdida de evaluación continua:</strong> examen global del módulo.<br />
              <strong>Acta:</strong> entero; en pantalla se muestran dos decimales.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

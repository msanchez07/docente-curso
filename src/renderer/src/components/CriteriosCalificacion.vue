<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { REQUISITOS_CONOCIDOS, type Modalidad, type ModeloEvaluacion } from '@shared/tipos'
import SelectorGrupo from '@renderer/components/SelectorGrupo.vue'
import { useAppStore } from '@renderer/stores/app'

const store = useAppStore()

const modelo = ref<ModeloEvaluacion | null>(null)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)

const sumaCategorias = computed(
  () => modelo.value?.categorias.reduce((t, c) => t + (Number(c.peso) || 0), 0) ?? 0
)
const sumaAvaluaciones = computed(
  () => modelo.value?.avaluaciones.reduce((t, a) => t + (Number(a.peso) || 0), 0) ?? 0
)
const categoriasOk = computed(() => Math.abs(sumaCategorias.value - 100) <= 0.5)
const avaluacionesOk = computed(() => Math.abs(sumaAvaluaciones.value - 100) <= 0.5)
const valido = computed(
  () =>
    (modelo.value?.categorias.length ?? 0) > 0 &&
    (modelo.value?.avaluaciones.length ?? 0) > 0 &&
    categoriasOk.value &&
    avaluacionesOk.value
)

const formulaAvaluacion = computed(() => {  const categorias = modelo.value?.categorias.filter((c) => Number(c.peso) > 0) ?? []
  return categorias.length === 0 ? '—' : categorias.map((c) => `${c.peso} % ${c.nombre}`).join(' + ')
})

const formulaFinal = computed(() => {
  const avaluaciones = modelo.value?.avaluaciones.filter((a) => Number(a.peso) > 0) ?? []
  return avaluaciones.length === 0
    ? '—'
    : avaluaciones.map((a) => `${a.peso} % ${a.nombre}`).join(' + ')
})

function esConocido(id: string): boolean {
  return (REQUISITOS_CONOCIDOS as readonly string[]).includes(id)
}

function idDesde(nombre: string, existentes: string[]): string {
  const base =
    nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'elemento'
  let id = base
  let n = 2
  while (existentes.includes(id)) id = `${base}_${n++}`
  return id
}

async function cargar(): Promise<void> {
  error.value = null
  mensaje.value = null
  modelo.value =
    store.grupoActivo !== null ? await window.api.evaluacion.modelo(store.grupoActivo) : null
}

onMounted(cargar)
watch(() => store.grupoActivo, cargar)

const modalidadGrupo = computed<Modalidad>(() => store.grupo?.modalidad ?? 'presencial')
const etiquetaModalidad = computed(() =>
  modalidadGrupo.value === 'semipresencial' ? 'Semipresencial' : 'Presencial'
)

async function cargarPorDefecto(): Promise<void> {
  if (!modelo.value) return
  if (
    !confirm(
      `¿Sustituir los criterios actuales por los valores por defecto de la modalidad ${etiquetaModalidad.value}?`
    )
  ) {
    return
  }
  modelo.value = await window.api.evaluacion.porDefecto(modalidadGrupo.value)
}

function anadirCategoria(): void {
  if (!modelo.value) return
  const ids = modelo.value.categorias.map((c) => c.id)
  modelo.value.categorias.push({ id: idDesde('nueva', ids), nombre: 'Nueva categoría', peso: 0 })
}

function quitarCategoria(indice: number): void {
  modelo.value?.categorias.splice(indice, 1)
}

function anadirAvaluacion(): void {
  if (!modelo.value) return
  const n = modelo.value.avaluaciones.length + 1
  modelo.value.avaluaciones.push({ id: `AV${n}`, nombre: `${n}ª evaluación`, peso: 0 })
}

function quitarAvaluacion(indice: number): void {
  modelo.value?.avaluaciones.splice(indice, 1)
}

function anadirRequisito(): void {
  if (!modelo.value) return
  const ids = modelo.value.requisitos.map((r) => r.id)
  modelo.value.requisitos.push({
    id: idDesde('requisito', ids),
    nombre: 'Nuevo requisito',
    valor: 5,
    descripcion: ''
  })
}

function quitarRequisito(indice: number): void {
  modelo.value?.requisitos.splice(indice, 1)
}

async function guardar(): Promise<void> {
  error.value = null
  mensaje.value = null
  if (!modelo.value || store.grupoActivo === null) return
  try {
    for (const categoria of modelo.value.categorias) {
      if (!categoria.id) categoria.id = idDesde(categoria.nombre, [])
    }
    modelo.value = await window.api.evaluacion.guardarModelo(store.grupoActivo, modelo.value)
    mensaje.value = `Criterios guardados para «${store.grupo?.nombre}».`
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  }
}

async function aplicarATodos(): Promise<void> {
  if (!modelo.value || !store.ciclos[0]) return
  if (
    !confirm('¿Aplicar estos criterios a TODOS los grupos del ciclo? Se sobrescribirán los suyos.')
  ) {
    return
  }
  error.value = null
  mensaje.value = null
  try {
    const total = await window.api.evaluacion.aplicarATodos(store.ciclos[0].id, modelo.value)
    mensaje.value = `Criterios aplicados a ${total} grupos del ciclo.`
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  }
}
</script>

<template>
  <div>
    <div class="cabecera-criterios">
      <div class="cabecera-criterios__titulo">
        <h3>Criterios de calificación</h3>
        <span class="tenue">Cómo se calcula la nota del grupo seleccionado.</span>
      </div>
      <div class="cabecera-criterios__acciones">
        <SelectorGrupo />
        <span class="tenue">Modalidad: <strong>{{ etiquetaModalidad }}</strong></span>
        <button class="boton" :disabled="!modelo" @click="cargarPorDefecto">
          Valores por defecto
        </button>
        <button class="boton" :disabled="!modelo" @click="aplicarATodos">Aplicar al ciclo</button>
      </div>
    </div>

    <p v-if="mensaje" class="aviso" style="background: #ecfdf3; color: #067647" role="status">
      {{ mensaje }}
    </p>
    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>

    <div v-if="!modelo" class="vacio">
      Crea un grupo en la pestaña «Grupos» para definir sus criterios de calificación.
    </div>

    <template v-else>
      <div class="columnas">
        <section class="tarjeta" aria-labelledby="titulo-categorias">
          <header class="cabecera-criterios">
            <h3 id="titulo-categorias">Categorías</h3>
            <span class="barra__espacio"></span>
            <span :class="categoriasOk ? 'chip chip--ok' : 'chip chip--aviso'" aria-live="polite">
              {{ categoriasOk ? '✓' : '⚠' }} {{ sumaCategorias }} %
            </span>
          </header>
          <p class="tenue">Peso de cada tipo de entrega dentro de la avaluación.</p>

          <div class="lista-pesos">
            <div class="fila-peso fila-peso--cabecera" aria-hidden="true">
              <span>Categoría</span>
              <span class="num">Peso</span>
              <span></span>
            </div>
            <div v-for="(cat, i) in modelo.categorias" :key="cat.id" class="fila-peso">
              <input
                v-model="cat.nombre"
                :aria-label="`Nombre de la categoría ${i + 1}`"
                placeholder="Exámenes"
              />
              <span class="entrada-peso">
                <input
                  v-model.number="cat.peso"
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  :aria-label="`Peso de ${cat.nombre || `la categoría ${i + 1}`}, en porcentaje`"
                />
                <span aria-hidden="true">%</span>
              </span>
              <button
                class="icono-boton"
                :aria-label="`Quitar ${cat.nombre || `la categoría ${i + 1}`}`"
                title="Quitar"
                @click="quitarCategoria(i)"
              >
                ✕
              </button>
            </div>
          </div>

          <button class="boton boton--sutil" style="margin-top: 16px" @click="anadirCategoria">
            + Añadir categoría
          </button>
        </section>

        <section class="tarjeta" aria-labelledby="titulo-avaluaciones">
          <header class="cabecera-criterios">
            <h3 id="titulo-avaluaciones">Avaluaciones</h3>
            <span class="barra__espacio"></span>
            <span :class="avaluacionesOk ? 'chip chip--ok' : 'chip chip--aviso'" aria-live="polite">
              {{ avaluacionesOk ? '✓' : '⚠' }} {{ sumaAvaluaciones }} %
            </span>
          </header>
          <p class="tenue">Peso de cada trimestre en la nota final.</p>

          <div class="lista-pesos">
            <div class="fila-peso fila-peso--avaluacion fila-peso--cabecera" aria-hidden="true">
              <span>Código</span>
              <span>Nombre</span>
              <span class="num">Peso</span>
              <span></span>
            </div>
            <div
              v-for="(av, i) in modelo.avaluaciones"
              :key="av.id"
              class="fila-peso fila-peso--avaluacion"
            >
              <input
                v-model="av.id"
                class="monospace"
                :aria-label="`Código de la avaluación ${i + 1}`"
                placeholder="AV1"
              />
              <input
                v-model="av.nombre"
                :aria-label="`Nombre de la avaluación ${i + 1}`"
                placeholder="1ª evaluación"
              />
              <span class="entrada-peso">
                <input
                  v-model.number="av.peso"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  :aria-label="`Peso de ${av.nombre || `la avaluación ${i + 1}`}, en porcentaje`"
                />
                <span aria-hidden="true">%</span>
              </span>
              <button
                class="icono-boton"
                :aria-label="`Quitar ${av.nombre || `la avaluación ${i + 1}`}`"
                title="Quitar"
                @click="quitarAvaluacion(i)"
              >
                ✕
              </button>
            </div>
          </div>

          <button class="boton boton--sutil" style="margin-top: 16px" @click="anadirAvaluacion">
            + Añadir avaluación
          </button>
        </section>
      </div>

      <section class="tarjeta" aria-labelledby="titulo-formula">
        <h3 id="titulo-formula">Cómo se calcula</h3>
        <p class="tenue">Se actualiza a medida que cambias los pesos.</p>
        <div class="formula" role="status" aria-live="polite">
          <p class="formula__linea">
            <span class="formula__etiqueta">NOTA DE CADA AVALUACIÓN</span>
            <span class="formula__valor">{{ formulaAvaluacion }}</span>
          </p>
          <p class="formula__linea">
            <span class="formula__etiqueta">NOTA FINAL DEL MÓDULO</span>
            <span class="formula__valor">{{ formulaFinal }}</span>
          </p>
        </div>
      </section>

      <section class="tarjeta" aria-labelledby="titulo-minimos">
        <h3 id="titulo-minimos">Requisitos mínimos</h3>
        <p class="tenue" style="margin-bottom: 6px">
          Los que llevan la marca <span class="chip chip--ok">se aplica</span> entran en el cálculo
          (puedes cambiarles el nombre). Los que añadas de más se guardan y salen en el informe.
        </p>

        <div class="lista-requisitos">
          <div class="fila-requisito fila-requisito--cabecera" aria-hidden="true">
            <span>Requisito</span>
            <span class="num">Valor</span>
            <span></span>
          </div>
          <div v-for="(req, i) in modelo.requisitos" :key="req.id" class="fila-requisito">
            <div class="fila-requisito__texto">
              <input
                v-model="req.nombre"
                class="requisito-nombre"
                :aria-label="`Nombre del requisito ${i + 1}`"
                placeholder="Nombre del requisito"
              />
              <div class="requisito-pie">
                <input
                  v-model="req.descripcion"
                  class="requisito-descripcion"
                  :aria-label="`Descripción del requisito ${i + 1}`"
                  placeholder="Explicación (opcional)"
                />
                <span v-if="esConocido(req.id)" class="chip chip--ok">se aplica</span>
              </div>
            </div>
            <input
              v-model.number="req.valor"
              type="number"
              min="0"
              max="10"
              step="0.5"
              :aria-label="`Valor de ${req.nombre || `el requisito ${i + 1}`}`"
            />
            <button
              class="icono-boton"
              :aria-label="`Quitar ${req.nombre || `el requisito ${i + 1}`}`"
              title="Quitar"
              @click="quitarRequisito(i)"
            >
              ✕
            </button>
          </div>
        </div>

        <button class="boton boton--sutil" style="margin-top: 16px" @click="anadirRequisito">
          + Añadir requisito
        </button>
      </section>

      <div class="acciones-criterios">
        <span v-if="!valido" class="aviso aviso--aviso" role="alert">
          Los pesos deben sumar 100 % en cada bloque para poder guardar.
        </span>
        <span class="barra__espacio"></span>
        <button class="boton boton--principal" :disabled="!valido" @click="guardar">
          Guardar criterios
        </button>
      </div>
    </template>
  </div>
</template>

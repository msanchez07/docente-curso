<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EditorCriterios from '@renderer/components/EditorCriterios.vue'
import { etiquetaModalidad } from '@shared/grupos'
import type { CriterioDisponible, GrupoClase, ModeloEvaluacion } from '@shared/tipos'

const props = defineProps<{ grupo: GrupoClase }>()

const modelo = ref<ModeloEvaluacion | null>(null)
const valido = ref(false)
const cargando = ref(true)
const guardando = ref(false)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const guardado = ref(false)
const plantilla = ref<string | null>(null)
const ras = ref<{ codigo: string; descripcion: string }[]>([])

const etiqueta = computed(() => etiquetaModalidad(props.grupo.modalidad))

onMounted(async () => {
  try {
    const [existente, base, criterios] = await Promise.all([
      window.api.criterios.obtener(props.grupo.id),
      window.api.criterios.plantillaParaGrupo(props.grupo.id),
      window.api.entregasClase.criterios(props.grupo.id)
    ])
    plantilla.value = base.nombre
    const mapa = new Map<string, string>()
    for (const criterio of criterios as CriterioDisponible[]) {
      if (!mapa.has(criterio.raCodigo)) mapa.set(criterio.raCodigo, criterio.raDescripcion)
    }
    ras.value = [...mapa.entries()].map(([codigo, descripcion]) => ({ codigo, descripcion }))
    if (existente) {
      modelo.value = existente
      guardado.value = true
    } else {
      modelo.value = base.modelo
    }
    if (
      modelo.value &&
      Object.keys(modelo.value.pesosRa ?? {}).length === 0 &&
      ras.value.length > 0
    ) {
      const base = Math.floor((100 / ras.value.length) * 100) / 100
      const pesos: Record<string, number> = {}
      let acumulado = 0
      ras.value.forEach((ra, indice) => {
        const peso =
          indice === ras.value.length - 1 ? Math.round((100 - acumulado) * 100) / 100 : base
        pesos[ra.codigo] = peso
        acumulado += peso
      })
      modelo.value.pesosRa = pesos
    }
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
})

async function guardar(): Promise<void> {
  if (!modelo.value || !valido.value) return
  guardando.value = true
  error.value = null
  mensaje.value = null
  try {
    modelo.value = await window.api.criterios.guardar(props.grupo.id, modelo.value)
    guardado.value = true
    mensaje.value = 'Criterios guardados.'
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function crearPlantilla(): Promise<void> {
  if (!modelo.value || !valido.value) return
  guardando.value = true
  error.value = null
  mensaje.value = null
  try {
    modelo.value = await window.api.criterios.guardar(props.grupo.id, modelo.value)
    guardado.value = true
    const creada = await window.api.criterios.crearPlantillaDesdeGrupo(props.grupo.id, modelo.value)
    plantilla.value = creada.nombre
    mensaje.value = `Plantilla «${creada.nombre}» guardada. Se aplicará a los grupos nuevos con el mismo módulo y modalidad.`
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}

async function copiar(): Promise<void> {
  if (!modelo.value || !valido.value) return
  guardando.value = true
  error.value = null
  mensaje.value = null
  try {
    modelo.value = await window.api.criterios.guardar(props.grupo.id, modelo.value)
    guardado.value = true
    const copiados = await window.api.criterios.copiar(props.grupo.id)
    mensaje.value =
      copiados === 0
        ? 'No hay otros grupos del mismo módulo.'
        : `Criterios guardados y copiados a ${copiados} grupo(s) del mismo módulo.`
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="tarjeta criterios">
    <div v-if="cargando" class="vacio">Cargando criterios…</div>

    <template v-else-if="modelo">
      <div class="criterios__barra">
        <span class="tenue">
          <template v-if="plantilla">
            Plantilla: <strong>{{ plantilla }}</strong>
          </template>
          <template v-else-if="guardado">Criterios propios del grupo.</template>
          <template v-else>
            Sin plantilla propia: valores por defecto de <strong>{{ etiqueta }}</strong>
          </template>
        </span>
        <span class="barra__espacio"></span>
        <button
          class="boton boton--sutil"
          type="button"
          :disabled="!valido || guardando"
          @click="crearPlantilla"
        >
          Crear plantilla de este grupo
        </button>
        <span class="chip" :class="guardado ? 'chip--ok' : 'chip--aviso'">
          {{ guardado ? 'Criterios guardados' : 'Sin guardar' }}
        </span>
      </div>

      <EditorCriterios :modelo="modelo" :ras="ras" @valido="valido = $event" />

      <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
      <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>
    </template>

    <p v-else class="aviso aviso--error" role="alert">
      {{ error ?? 'No se pudieron cargar los criterios.' }}
    </p>

    <div class="criterios__acciones">
      <button class="boton" type="button" :disabled="!valido || guardando" @click="copiar">
        Copiar al mismo módulo
      </button>
      <button
        class="boton boton--principal"
        type="button"
        :disabled="!valido || guardando"
        @click="guardar"
      >
        {{ guardando ? 'Guardando…' : 'Guardar criterios' }}
      </button>
    </div>
  </div>
</template>

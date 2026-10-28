<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BotonVolver from '@renderer/components/BotonVolver.vue'
import Confirmacion from '@renderer/components/Confirmacion.vue'
import MenuAcciones, { type AccionMenu } from '@renderer/components/MenuAcciones.vue'
import { etiquetaModalidad } from '@shared/grupos'
import type { PlantillaCriterios } from '@shared/tipos'

const router = useRouter()
const plantillas = ref<PlantillaCriterios[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const mensaje = ref<string | null>(null)
const plantillaABorrar = ref<PlantillaCriterios | null>(null)
const borrando = ref(false)

function acciones(): AccionMenu[] {
  return [
    { id: 'editar', etiqueta: 'Editar plantilla', icono: 'editar' },
    { id: 'borrar', etiqueta: 'Borrar plantilla', icono: 'borrar', peligro: true }
  ]
}

function ejecutarAccion(plantilla: PlantillaCriterios, accion: string): void {
  if (accion === 'editar') {
    void router.push({ name: 'plantilla-editar', params: { plantillaId: plantilla.id } })
  } else if (accion === 'borrar') {
    plantillaABorrar.value = plantilla
  }
}

async function cargar(): Promise<void> {
  cargando.value = true
  error.value = null
  try {
    plantillas.value = await window.api.criterios.listarPlantillas()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

async function borrar(): Promise<void> {
  if (!plantillaABorrar.value) return
  borrando.value = true
  error.value = null
  try {
    await window.api.criterios.borrarPlantilla(plantillaABorrar.value.id)
    mensaje.value = 'Plantilla borrada.'
    plantillaABorrar.value = null
    await cargar()
  } catch (e) {
    error.value = (e as Error).message ?? String(e)
  } finally {
    borrando.value = false
  }
}

function fecha(cadena: string): string {
  const [anio, mes, dia] = cadena.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}
</script>

<template>
  <section class="vista vista--ancha">
    <BotonVolver a="/grupos" />

    <header class="vista__cabecera">
      <h2>Plantillas de criterios</h2>
      <p class="tenue">
        Se crean desde los criterios de un grupo. Los grupos nuevos del mismo módulo y modalidad
        las usan automáticamente.
      </p>
    </header>

    <div class="barra">
      <RouterLink to="/grupos" class="boton">Gestionar grupos</RouterLink>
      <span class="barra__espacio"></span>
      <span class="tenue">{{ plantillas.length }} plantillas</span>
    </div>

    <p v-if="error" class="aviso aviso--error" role="alert">{{ error }}</p>
    <p v-if="mensaje" class="aviso aviso--ok" role="status">{{ mensaje }}</p>

    <div v-if="cargando" class="vacio">Cargando plantillas…</div>
    <div v-else-if="plantillas.length === 0" class="vacio">
      Todavía no hay plantillas. Abre los criterios de un grupo y pulsa «Crear plantilla de este
      grupo».
    </div>

    <div v-else class="tarjeta tarjeta--tabla">
      <div class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th>Plantilla</th>
              <th>Módulo</th>
              <th>Modalidad</th>
              <th>Actualizada</th>
              <th class="acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plantilla in plantillas" :key="plantilla.id">
              <td>
                <RouterLink
                  :to="{ name: 'plantilla-editar', params: { plantillaId: plantilla.id } }"
                  class="grupo__enlace"
                >
                  {{ plantilla.nombre }}
                </RouterLink>
              </td>
              <td class="monospace">{{ plantilla.modulo_codigo }}</td>
              <td>{{ etiquetaModalidad(plantilla.modalidad) }}</td>
              <td class="tenue">{{ fecha(plantilla.actualizado_en) }}</td>
              <td class="acciones">
                <MenuAcciones
                  :acciones="acciones()"
                  @accion="ejecutarAccion(plantilla, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Confirmacion
      v-if="plantillaABorrar"
      titulo="¿Borrar la plantilla?"
      etiqueta-confirmar="Sí, borrar"
      peligro
      :ocupado="borrando"
      @cancelar="plantillaABorrar = null"
      @confirmar="borrar"
    >
      <p>
        Se borrará <strong>{{ plantillaABorrar.nombre }}</strong>. Los grupos que ya la usan no
        pierden sus criterios.
      </p>
    </Confirmacion>
  </section>
</template>

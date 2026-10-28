import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ciclo, ResumenCiclo } from '@shared/tipos'

/** Estado de la vista BOE: ciclos disponibles y ciclo seleccionado. */
export const useBoeStore = defineStore('boe', () => {
  const ciclos = ref<ResumenCiclo[]>([])
  const ciclo = ref<Ciclo | null>(null)
  const cargando = ref(false)
  const error = ref<string | null>(null)

  async function cargarCiclos(): Promise<void> {
    cargando.value = true
    error.value = null
    try {
      ciclos.value = await window.api.boe.listarCiclos()
    } catch (e) {
      error.value = `No se pudieron cargar los ciclos: ${String(e)}`
    } finally {
      cargando.value = false
    }
  }

  async function cargarCiclo(id: string): Promise<void> {
    cargando.value = true
    error.value = null
    try {
      ciclo.value = await window.api.boe.obtenerCiclo(id)
    } catch (e) {
      error.value = `No se pudo cargar el ciclo ${id}: ${String(e)}`
    } finally {
      cargando.value = false
    }
  }

  return { ciclos, ciclo, cargando, error, cargarCiclos, cargarCiclo }
})

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { GrupoClase } from '@shared/tipos'

/**
 * Estado compartido de los grupos de clase.
 *
 * La barra lateral, el dashboard y las secciones del grupo leen de aquí para
 * no repetir peticiones ni quedar desincronizados.
 */
export const useGruposClaseStore = defineStore('grupos-clase', () => {
  const grupos = ref<GrupoClase[]>([])
  const cargando = ref(false)
  const cargado = ref(false)
  const error = ref<string | null>(null)

  const porId = computed(() => new Map(grupos.value.map((grupo) => [grupo.id, grupo])))
  let enCurso: Promise<void> | null = null

  function cargar(forzar = false): Promise<void> {
    if (enCurso) return enCurso
    if (cargado.value && !forzar) return Promise.resolve()

    enCurso = (async () => {
      cargando.value = true
      error.value = null
      try {
        grupos.value = await window.api.gruposClase.listar()
        cargado.value = true
      } catch (e) {
        error.value = (e as Error).message ?? String(e)
      } finally {
        cargando.value = false
        enCurso = null
      }
    })()

    return enCurso
  }

  function grupo(id: number): GrupoClase | null {
    return porId.value.get(id) ?? null
  }

  return { grupos, cargando, cargado, error, cargar, grupo }
})

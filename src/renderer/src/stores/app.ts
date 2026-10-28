import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { GrupoDetalle, ResumenCiclo, ResumenModulo } from '@shared/tipos'

/**
 * Estado global: ciclos, módulos y **grupos** (módulo + modalidad), con el
 * grupo activo, que es la unidad de trabajo de toda la aplicación.
 */
export const useAppStore = defineStore('app', () => {
  const ciclos = ref<ResumenCiclo[]>([])
  const modulos = ref<ResumenModulo[]>([])
  const grupos = ref<GrupoDetalle[]>([])
  const grupoActivo = ref<number | null>(null)
  const error = ref<string | null>(null)
  const listo = ref(false)

  const grupo = computed(() => grupos.value.find((g) => g.id === grupoActivo.value) ?? null)
  const modulo = computed(() => {
    const codigo = grupo.value?.modulo_codigo
    return codigo ? (modulos.value.find((m) => m.codigo === codigo) ?? null) : null
  })

  async function cargarGrupos(): Promise<void> {
    grupos.value = await window.api.grupos.listar()
    if (!grupos.value.some((g) => g.id === grupoActivo.value)) {
      grupoActivo.value = grupos.value[0]?.id ?? null
    }
  }

  async function inicializar(forzar = false): Promise<void> {
    if (listo.value && !forzar) return
    try {
      ciclos.value = await window.api.boe.listarCiclos()
      if (ciclos.value.length > 0) {
        modulos.value = await window.api.bd.listarModulos(ciclos.value[0].id)
      }
      await cargarGrupos()
      listo.value = true
    } catch (e) {
      error.value = `No se pudo inicializar la aplicación: ${String(e)}`
    }
  }

  return {
    ciclos,
    modulos,
    grupos,
    grupoActivo,
    error,
    listo,
    grupo,
    modulo,
    inicializar,
    cargarGrupos
  }
})

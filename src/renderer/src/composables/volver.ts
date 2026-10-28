import { computed, ref } from 'vue'
import { useRouter, type RouteLocationRaw, type Router } from 'vue-router'

/**
 * Última ruta interna visitada. Se actualiza en cada navegación para que los
 * botones «Volver» regresen al lugar real de origen y no siempre al grupo.
 */
const anterior = ref<string | null>(null)

export function registrarNavegacion(router: Router): void {
  router.afterEach((to, from) => {
    if (from.name && from.fullPath !== to.fullPath) {
      anterior.value = from.fullPath
    }
  })
}

export function useVolver(fallback: () => RouteLocationRaw) {
  const router = useRouter()
  const puedeVolver = computed(
    () => anterior.value !== null && anterior.value !== router.currentRoute.value.fullPath
  )

  function volver(): void {
    if (puedeVolver.value) router.back()
    else void router.push(fallback())
  }

  return { volver, puedeVolver }
}

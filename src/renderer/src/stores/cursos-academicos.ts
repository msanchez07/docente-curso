import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CursoAcademico, CursoAcademicoEntrada } from '@shared/tipos'

const CLAVE_ACTIVO = 'gestion-entregas:curso-academico-activo'

/**
 * Curso académico activo y catálogo de cursos.
 *
 * El curso activo filtra los grupos de la barra lateral y de la sección
 * Grupos. Se recuerda en localStorage para volver al mismo al recargar.
 */
export const useCursosAcademicosStore = defineStore('cursos-academicos', () => {
  const cursos = ref<CursoAcademico[]>([])
  const activoId = ref<number | null>(null)
  const cargando = ref(false)
  const cargado = ref(false)
  const error = ref<string | null>(null)
  let enCurso: Promise<void> | null = null

  const activo = computed(() => cursos.value.find((curso) => curso.id === activoId.value) ?? null)
  const actual = computed(() => cursos.value.find((curso) => curso.actual) ?? null)

  function cargar(forzar = false): Promise<void> {
    if (enCurso) return enCurso
    if (cargado.value && !forzar) return Promise.resolve()

    enCurso = (async () => {
      cargando.value = true
      error.value = null
      try {
        const anterior = activoId.value
        cursos.value = await window.api.cursosAcademicos.listar()
        const conservarActivo =
          anterior !== null && cursos.value.some((curso) => curso.id === anterior)
        activoId.value = conservarActivo
          ? anterior
          : (cursos.value.find((curso) => curso.actual)?.id ?? cursos.value[0]?.id ?? null)
        if (activoId.value !== null) {
          localStorage.setItem(CLAVE_ACTIVO, String(activoId.value))
        }
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

  function activar(id: number): void {
    if (!cursos.value.some((curso) => curso.id === id)) return
    activoId.value = id
    localStorage.setItem(CLAVE_ACTIVO, String(id))
  }

  async function crear(entrada: CursoAcademicoEntrada): Promise<CursoAcademico> {
    const creado = await window.api.cursosAcademicos.crear(entrada)
    await cargar(true)
    if (creado.actual) activar(creado.id)
    return creado
  }

  async function actualizar(
    id: number,
    entrada: CursoAcademicoEntrada
  ): Promise<CursoAcademico | null> {
    const actualizado = await window.api.cursosAcademicos.actualizar(id, entrada)
    await cargar(true)
    return actualizado
  }

  async function marcarActual(id: number): Promise<CursoAcademico | null> {
    const actualizado = await window.api.cursosAcademicos.marcarActual(id)
    await cargar(true)
    if (actualizado) activar(id)
    return actualizado
  }

  async function borrar(id: number): Promise<boolean> {
    const borrado = await window.api.cursosAcademicos.borrar(id)
    await cargar(true)
    return borrado
  }

  return {
    cursos,
    activoId,
    activo,
    actual,
    cargando,
    cargado,
    error,
    cargar,
    activar,
    crear,
    actualizar,
    marcarActual,
    borrar
  }
})

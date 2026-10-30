import type {
  AlumnoClase,
  AvaluacionCalificacion,
  CriterioDisponible,
  CategoriaCalificacion,
  EntregaCalificacion,
  EntregaClase,
  FilaCalificacionClase,
  GrupoClase,
  ModeloEvaluacion,
  NotaGuardadaClase,
  RaCalificacion,
  ResumenCalificacionesClase,
  UnidadCalificacion,
  UnidadProgramacion
} from './tipos'

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

function requisito(modelo: ModeloEvaluacion, id: string, porDefecto: number): number {
  const valor = Number(modelo.requisitos?.find((r) => r.id === id)?.valor)
  return Number.isFinite(valor) ? valor : porDefecto
}

interface Acumulado {
  peso: number
  valor: number
}

function mediaPonderada(items: Acumulado[]): number | null {
  const validos = items.filter((item) => item.peso > 0)
  const peso = validos.reduce((total, item) => total + item.peso, 0)
  if (peso === 0) return null
  const suma = validos.reduce((total, item) => total + item.peso * item.valor, 0)
  return redondear(suma / peso)
}

/**
 * Calcula la nota de cada alumno con el modelo de criterios del grupo.
 *
 * - La nota de una entrega es directa (0–10); una entrega sin nota cuenta 0.
 * - La categoría es la media simple de sus entregas en esa avaluación.
 * - La avaluación pondera las categorías que tienen entregas.
 * - La final pondera las avaluaciones con nota.
 */
export function calcularResumenClase(
  grupo: GrupoClase,
  modelo: ModeloEvaluacion,
  entregas: EntregaClase[],
  alumnos: AlumnoClase[],
  notas: NotaGuardadaClase[],
  criterios: CriterioDisponible[] = [],
  unidades: UnidadProgramacion[] = []
): ResumenCalificacionesClase {
  const minEntrega = requisito(modelo, 'notaMinimaEntrega', 4)
  const minCategoria = requisito(modelo, 'notaMinimaCategoria', 5)
  const minAvaluacion = requisito(modelo, 'notaMinimaAvaluacion', 5)
  const minAprobado = requisito(modelo, 'aprobado', 5)

  const mapaNotas = new Map<string, NotaGuardadaClase>()
  for (const nota of notas) {
    mapaNotas.set(`${nota.alumno_id}:${nota.entrega_id}`, nota)
  }

  const cePorId = new Map(criterios.map((criterio) => [criterio.ceId, criterio]))
  const rasModulo: { codigo: string; descripcion: string }[] = []
  const rasVistos = new Set<string>()
  for (const criterio of criterios) {
    if (rasVistos.has(criterio.raCodigo)) continue
    rasVistos.add(criterio.raCodigo)
    rasModulo.push({ codigo: criterio.raCodigo, descripcion: criterio.raDescripcion })
  }

  const filas: FilaCalificacionClase[] = alumnos.map((alumno) => {
    let incompleta = false

    const avaluaciones: AvaluacionCalificacion[] = modelo.avaluaciones.map((avaluacion) => {
      const categorias: CategoriaCalificacion[] = []
      const motivos: string[] = []

      for (const categoria of modelo.categorias) {
        const entregasCategoria = entregas.filter(
          (entrega) =>
            entrega.avaluacion_id === avaluacion.id && entrega.categoria_id === categoria.id
        )
        if (entregasCategoria.length === 0) continue

        const detalle: EntregaCalificacion[] = entregasCategoria.map((entrega) => {
          const registro = mapaNotas.get(`${alumno.id}:${entrega.id}`)
          const nota = registro?.nota ?? null
          if (nota === null) incompleta = true
          const valor = nota ?? 0
          return {
            entregaId: entrega.id,
            titulo: entrega.titulo,
            nota,
            observaciones: registro?.observaciones ?? null,
            suspensa: valor < minEntrega,
            bloqueada: entrega.bloqueada
          }
        })

        const media = redondear(
          detalle.reduce((total, entrega) => total + (entrega.nota ?? 0), 0) / detalle.length
        )
        const suspensa = detalle.some((entrega) => entrega.suspensa) || media < minCategoria
        if (suspensa) motivos.push(`Categoría «${categoria.nombre}» suspensa`)

        categorias.push({
          categoriaId: categoria.id,
          nombre: categoria.nombre,
          peso: categoria.peso,
          media,
          suspensa,
          entregas: detalle
        })
      }

      const nota = mediaPonderada(
        categorias.map((categoria) => ({ peso: categoria.peso, valor: categoria.media ?? 0 }))
      )
      const suspensa =
        categorias.some((categoria) => categoria.suspensa) ||
        (nota !== null && nota < minAvaluacion)
      if (nota !== null && nota < minAvaluacion) {
        motivos.push(`Nota de la avaluación inferior a ${minAvaluacion}`)
      }

      return {
        avaluacionId: avaluacion.id,
        nombre: avaluacion.nombre,
        nota,
        suspensa,
        motivos,
        categorias
      }
    })

    const unidadesCalificadas: UnidadCalificacion[] = unidades.map((unidad) => {
      const requisitoUnidad = (id: string, porDefecto: number): number => {
        const valor = Number(unidad.requisitos.find((requisito) => requisito.id === id)?.valor)
        return Number.isFinite(valor) ? valor : porDefecto
      }
      const minEntregaUnidad = requisitoUnidad('notaMinimaEntrega', minEntrega)
      const minCategoriaUnidad = requisitoUnidad('notaMinimaCategoria', minCategoria)
      const minUnidad = requisitoUnidad('notaMinimaAvaluacion', minAprobado)
      const entregasUnidad = entregas.filter((entrega) => entrega.unidad_id === unidad.id)
      const detalle: EntregaCalificacion[] = entregasUnidad.map((entrega) => {
        const registro = mapaNotas.get(`${alumno.id}:${entrega.id}`)
        const nota = registro?.nota ?? null
        if (nota === null) incompleta = true
        return {
          entregaId: entrega.id,
          titulo: entrega.titulo,
          nota,
          observaciones: registro?.observaciones ?? null,
          suspensa: (nota ?? 0) < minEntregaUnidad,
          bloqueada: entrega.bloqueada
        }
      })
      const categoriasUnidad = unidad.categorias.length > 0 ? unidad.categorias : modelo.categorias
      let categoriaSuspensa = false
      const mediasCategorias = categoriasUnidad
        .map((categoria) => {
          const entregasCategoria = entregasUnidad.filter(
            (entrega) => entrega.categoria_id === categoria.id
          )
          if (entregasCategoria.length === 0) return null
          const notas = entregasCategoria.map(
            (entrega) => mapaNotas.get(`${alumno.id}:${entrega.id}`)?.nota ?? 0
          )
          const media = redondear(notas.reduce((total, nota) => total + nota, 0) / notas.length)
          if (notas.some((nota) => nota < minEntregaUnidad) || media < minCategoriaUnidad) {
            categoriaSuspensa = true
          }
          return { peso: Number(categoria.peso) || 0, valor: media }
        })
        .filter((media): media is Acumulado => media !== null)
      const nota =
        mediasCategorias.length > 0
          ? mediaPonderada(mediasCategorias)
          : detalle.length === 0
            ? null
            : redondear(
                detalle.reduce((total, entrega) => total + (entrega.nota ?? 0), 0) / detalle.length
              )
      return {
        unidadId: unidad.id,
        avaluacionId: unidad.avaluacion_id,
        codigo: unidad.codigo,
        nombre: unidad.nombre,
        peso: Number(unidad.peso) || 0,
        nota,
        suspensa: categoriaSuspensa || (nota !== null && nota < minUnidad),
        entregas: detalle
      }
    })

    const usaUnidades = modelo.modoCalificacion === 'unidades' && unidadesCalificadas.length > 0
    const trimestres = modelo.avaluaciones.map((avaluacion) => {
      const unidadesAvaluacion = unidadesCalificadas.filter(
        (unidad) => unidad.avaluacionId === avaluacion.id
      )
      const nota = mediaPonderada(
        unidadesAvaluacion
          .filter((unidad) => unidad.nota !== null)
          .map((unidad) => ({ peso: unidad.peso, valor: unidad.nota ?? 0 }))
      )
      return {
        avaluacionId: avaluacion.id,
        nombre: avaluacion.nombre,
        peso: Number(avaluacion.peso) || 0,
        nota,
        suspensa:
          unidadesAvaluacion.some((unidad) => unidad.suspensa) ||
          (nota !== null && nota < minAvaluacion)
      }
    })
    const notaFinal = usaUnidades
      ? mediaPonderada(
          trimestres
            .filter((trimestre) => trimestre.nota !== null)
            .map((trimestre) => ({ peso: trimestre.peso, valor: trimestre.nota ?? 0 }))
        )
      : mediaPonderada(
          avaluaciones
            .filter((avaluacion) => avaluacion.nota !== null)
            .map((avaluacion) => ({
              peso: modelo.avaluaciones.find((a) => a.id === avaluacion.avaluacionId)?.peso ?? 0,
              valor: avaluacion.nota ?? 0
            }))
        )

    const ras: RaCalificacion[] = rasModulo.map((ra) => {
      const entregasRa = entregas.filter((entrega) =>
        entrega.ce_ids.some((ceId) => cePorId.get(ceId)?.raCodigo === ra.codigo)
      )
      const detalle = entregasRa.map((entrega) => {
        const nota = mapaNotas.get(`${alumno.id}:${entrega.id}`)?.nota ?? null
        return { entregaId: entrega.id, titulo: entrega.titulo, nota }
      })
      const nota =
        detalle.length === 0
          ? null
          : redondear(
              detalle.reduce((total, entrega) => total + (entrega.nota ?? 0), 0) / detalle.length
            )
      const criteriosRa = criterios
        .filter((criterio) => criterio.raCodigo === ra.codigo)
        .map((criterio) => {
          const entregasCe = entregas.filter((entrega) => entrega.ce_ids.includes(criterio.ceId))
          const notasCe = entregasCe
            .map((entrega) => mapaNotas.get(`${alumno.id}:${entrega.id}`)?.nota ?? null)
            .filter((notaCe): notaCe is number => notaCe !== null)
          const notaCe =
            notasCe.length === 0
              ? null
              : redondear(notasCe.reduce((total, valor) => total + valor, 0) / notasCe.length)
          return {
            ceId: criterio.ceId,
            codigo: criterio.ceCodigo,
            descripcion: criterio.descripcion,
            nota: notaCe,
            superado: notaCe !== null && notaCe >= minAprobado,
            evaluado: notasCe.length > 0,
            entregas: entregasCe.length
          }
        })
      return {
        codigo: ra.codigo,
        descripcion: ra.descripcion,
        nota,
        superado: nota !== null && nota >= minAprobado,
        criterios: criteriosRa,
        entregas: detalle
      }
    })

    const rasNoSuperados = ras.filter((ra) => !ra.superado).map((ra) => ra.codigo)
    const todosRasSuperados = ras.length === 0 || rasNoSuperados.length === 0

    const unidadesSuspensas = usaUnidades && unidadesCalificadas.some((unidad) => unidad.suspensa)
    const avaluacionesSuspensas =
      !usaUnidades && avaluaciones.some((avaluacion) => avaluacion.suspensa)
    const vaAConvocatoria =
      avaluacionesSuspensas ||
      unidadesSuspensas ||
      (notaFinal !== null && notaFinal < minAprobado) ||
      !todosRasSuperados

    return {
      alumno,
      avaluaciones,
      unidades: unidadesCalificadas,
      trimestres,
      ras,
      rasNoSuperados,
      todosRasSuperados,
      notaFinal,
      aprobado: notaFinal !== null && notaFinal >= minAprobado && !vaAConvocatoria,
      vaAConvocatoria,
      incompleta
    }
  })

  return { grupo, modelo, alumnos: filas }
}

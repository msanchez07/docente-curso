import { describe, expect, it } from 'vitest'
import { notaConvocatoriaAlumno } from '../src/shared/nota-convocatoria'
import type { AsignacionConvocatoria, BloqueConvocatoria } from '../src/shared/tipos'

const bloque = (id: number, peso: number, global = false): BloqueConvocatoria => ({
  id,
  convocatoria_id: 1,
  nombre: global ? 'Examen global' : `Bloque ${id}`,
  descripcion: null,
  avaluacion_id: global ? null : 'AV1',
  unidad_id: null,
  ra_codigo: null,
  peso,
  orden: id
})

const asignacion = (
  alumnoId: number,
  bloqueId: number,
  nota: number | null,
  incluida = true
): AsignacionConvocatoria => ({
  alumno_id: alumnoId,
  bloque_id: bloqueId,
  nota,
  observaciones: null,
  incluida
})

describe('nota de convocatoria', () => {
  it('usa el bloque global si está marcado', () => {
    expect(
      notaConvocatoriaAlumno(
        1,
        [bloque(1, 40), bloque(2, 60), bloque(99, 0, true)],
        [asignacion(1, 1, 4), asignacion(1, 2, 6), asignacion(1, 99, 7)]
      )
    ).toBe(7)
  })

  it('pondera los bloques marcados con nota', () => {
    expect(
      notaConvocatoriaAlumno(
        1,
        [bloque(1, 30), bloque(2, 70)],
        [asignacion(1, 1, 4), asignacion(1, 2, 8)]
      )
    ).toBe(6.8)
  })

  it('ignora bloques no incluidos y devuelve null sin notas', () => {
    expect(
      notaConvocatoriaAlumno(
        1,
        [bloque(1, 30), bloque(2, 70)],
        [asignacion(1, 1, 4, false), asignacion(1, 2, null)]
      )
    ).toBeNull()
    expect(notaConvocatoriaAlumno(1, [bloque(1, 100)], [])).toBeNull()
  })
})

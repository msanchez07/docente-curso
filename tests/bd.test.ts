import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { contarBoe, sembrarCiclos } from '../src/main/db/seed'
import {
  listarCiclos,
  listarModulos,
  obtenerCiclo,
  obtenerModulo
} from '../src/main/db/repositorios/boe'
import {
  actualizarAlumno,
  borrarAlumno,
  crearAlumno,
  desmatricular,
  importarAlumnos,
  listarAlumnos,
  obtenerAlumno
} from '../src/main/db/repositorios/alumnos'
import {
  crearEntrega,
  listarCriteriosDeEntrega,
  listarEntregas,
  mapearCriterios
} from '../src/main/db/repositorios/entregas'
import { crearGrupo } from '../src/main/db/repositorios/grupos'
import { listarGrupos } from '../src/main/db/repositorios/grupos'
import { vaciarDatos } from '../src/main/db/mantenimiento'
import {
  asegurarEntregaAlumno,
  calcularEntregaAlumno,
  registrarNota,
  resumenModulo
} from '../src/main/db/repositorios/notas'

const cicloPrueba: Ciclo = {
  id: 'test',
  denominacion: 'Ciclo de prueba',
  nivel: 'Formación Profesional de Grado Superior',
  familia_profesional: 'Informática y Comunicaciones',
  duracion_horas: 2000,
  ects: 120,
  rd: 'RD de prueba',
  boe_url: 'https://www.boe.es/',
  modulos: [
    {
      codigo: '0001',
      nombre: 'Módulo de prueba',
      siglas: 'MP',
      curso: '1',
      ects: 10,
      horas_minimas_boe: 100,
      ra: [
        {
          codigo: 'RA1',
          numero: 1,
          descripcion: 'RA uno',
          ce: [
            { codigo: 'a', descripcion: 'CE a' },
            { codigo: 'b', descripcion: 'CE b' }
          ]
        },
        {
          codigo: 'RA2',
          numero: 2,
          descripcion: 'RA dos',
          ce: [{ codigo: 'a', descripcion: 'CE a del RA2' }]
        }
      ]
    }
  ]
}

let db: Bd

beforeEach(() => {
  db = abrirBd(':memory:')
})

describe('esquema y siembra', () => {
  it('crea las tablas y siembra los datos del BOE', () => {
    sembrarCiclos(db, [cicloPrueba])
    expect(contarBoe(db)).toEqual({ ciclos: 1, modulos: 1, ra: 2, ce: 3 })
  })

  it('es idempotente', () => {
    sembrarCiclos(db, [cicloPrueba])
    sembrarCiclos(db, [cicloPrueba])
    expect(contarBoe(db)).toEqual({ ciclos: 1, modulos: 1, ra: 2, ce: 3 })
  })

  it('conserva los pesos ajustados a mano al resembrar', () => {
    sembrarCiclos(db, [cicloPrueba])
    const ra = db.prepare('SELECT id FROM resultados_aprendizaje WHERE codigo = ?').get('RA1') as {
      id: number
    }
    db.prepare('UPDATE resultados_aprendizaje SET peso = 40 WHERE id = ?').run(ra.id)
    db.prepare('UPDATE criterios_evaluacion SET peso = 25 WHERE ra_id = ?').run(ra.id)

    sembrarCiclos(db, [cicloPrueba])

    const pesoRa = db
      .prepare('SELECT peso FROM resultados_aprendizaje WHERE id = ?')
      .get(ra.id) as { peso: number }
    const pesosCe = db
      .prepare('SELECT peso FROM criterios_evaluacion WHERE ra_id = ?')
      .all(ra.id) as { peso: number }[]
    expect(pesoRa.peso).toBe(40)
    expect(pesosCe.every((c) => c.peso === 25)).toBe(true)
  })

  it('actualiza las descripciones si cambian en el BOE', () => {
    sembrarCiclos(db, [cicloPrueba])
    const modificado: Ciclo = JSON.parse(JSON.stringify(cicloPrueba))
    modificado.modulos[0].ra[0].descripcion = 'RA uno (actualizado)'
    sembrarCiclos(db, [modificado])
    const ra = db
      .prepare('SELECT descripcion FROM resultados_aprendizaje WHERE codigo = ?')
      .get('RA1') as { descripcion: string }
    expect(ra.descripcion).toBe('RA uno (actualizado)')
  })
})

describe('repositorio del BOE', () => {
  beforeEach(() => sembrarCiclos(db, [cicloPrueba]))

  it('lista ciclos con sus recuentos', () => {
    expect(listarCiclos(db)).toEqual([
      {
        id: 'test',
        denominacion: 'Ciclo de prueba',
        nivel: 'Formación Profesional de Grado Superior',
        modulos: 1,
        ra: 2,
        ce: 3
      }
    ])
  })

  it('lista módulos con sus recuentos', () => {
    expect(listarModulos(db, 'test')).toEqual([
      {
        codigo: '0001',
        nombre: 'Módulo de prueba',
        siglas: 'MP',
        curso: '1',
        ects: 10,
        horas_minimas_boe: 100,
        ra: 2,
        ce: 3
      }
    ])
  })

  it('devuelve un módulo con sus RA y CE', () => {
    const modulo = obtenerModulo(db, '0001')
    expect(modulo?.ra).toHaveLength(2)
    expect(modulo?.ra[0].ce).toHaveLength(2)
    expect(modulo?.ra[1].ce[0].descripcion).toBe('CE a del RA2')
  })

  it('reconstruye el ciclo completo con RA y CE anidados', () => {
    const ciclo = obtenerCiclo(db, 'test')
    expect(ciclo?.modulos[0].ra).toHaveLength(2)
    expect(ciclo?.modulos[0].ra[0].ce.map((c) => c.codigo)).toEqual(['a', 'b'])
    expect(ciclo?.modulos[0].ra[1].ce).toHaveLength(1)
  })

  it('devuelve null para un ciclo inexistente', () => {
    expect(obtenerCiclo(db, 'no-existe')).toBeNull()
  })
})

describe('repositorio de alumnos', () => {
  it('crea, lista, actualiza y borra', () => {
    const alumno = crearAlumno(db, { nombre: 'Ana', apellidos: 'García', dni: '12345678Z' })
    expect(alumno.id).toBeGreaterThan(0)
    expect(alumno.activo).toBe(true)
    expect(listarAlumnos(db)).toHaveLength(1)

    const actualizado = actualizarAlumno(db, alumno.id, {
      nombre: 'Ana',
      apellidos: 'García López',
      activo: false
    })
    expect(actualizado?.apellidos).toBe('García López')
    expect(actualizado?.activo).toBe(false)
    expect(listarAlumnos(db, { soloActivos: true })).toHaveLength(0)

    expect(borrarAlumno(db, alumno.id)).toBe(true)
    expect(listarAlumnos(db)).toHaveLength(0)
  })

  it('normaliza cadenas vacías a null', () => {
    const alumno = crearAlumno(db, { nombre: 'Luis', apellidos: 'Pérez', dni: '', email: '' })
    expect(alumno.dni).toBeNull()
    expect(alumno.email).toBeNull()
  })

  it('rechaza un DNI con letra incorrecta', () => {
    expect(() => crearAlumno(db, { nombre: 'X', apellidos: 'Y', dni: '12345678A' })).toThrow()
  })

  it('rechaza un correo mal formado', () => {
    expect(() =>
      crearAlumno(db, { nombre: 'X', apellidos: 'Y', email: 'no-es-un-correo' })
    ).toThrow()
  })

  it('importa desde el volcado JSON y desde texto delimitado', () => {
    const json = `[[{"nombre":"Ana","apellidos":"García","direccindecorreo":"ana@ejemplo.com","grupos":"2º DAW"},{"nombre":"Luis","apellidos":"Pérez"}]]`
    const primero = importarAlumnos(db, json)
    expect(primero.creados).toBe(2)
    expect(primero.errores).toEqual([])

    const csv = 'nombre;apellidos\nMarta;Ruiz'
    expect(importarAlumnos(db, csv).creados).toBe(1)
    expect(listarAlumnos(db)).toHaveLength(3)
  })

  it('informa de las filas con errores sin abortar la importación', () => {
    const resultado = importarAlumnos(db, 'Ana,García,,ana@ejemplo.com\nSoloNombre')
    expect(resultado.creados).toBe(1)
    expect(resultado.errores).toHaveLength(1)
    expect(listarAlumnos(db)).toHaveLength(1)
  })

  it('matricula, desmatricula y filtra por grupo', () => {
    sembrarCiclos(db, [cicloPrueba])
    const grupo = crearGrupo(db, {
      modulo_codigo: '0001',
      nombre: 'Presencial',
      modalidad: 'presencial'
    })
    const alumno = crearAlumno(db, { nombre: 'Ana', apellidos: 'García', grupos: [grupo.id] })
    expect(alumno.grupos).toEqual([grupo.id])
    expect(listarAlumnos(db, { grupoId: grupo.id })).toHaveLength(1)

    expect(desmatricular(db, alumno.id, grupo.id)).toBe(true)
    expect(obtenerAlumno(db, alumno.id)?.grupos).toEqual([])
    expect(listarAlumnos(db, { grupoId: grupo.id })).toHaveLength(0)

    actualizarAlumno(db, alumno.id, { nombre: 'Ana', apellidos: 'García', grupos: [grupo.id] })
    expect(obtenerAlumno(db, alumno.id)?.grupos).toEqual([grupo.id])
  })

  it('la importación matricula en el grupo indicado', () => {
    sembrarCiclos(db, [cicloPrueba])
    const grupo = crearGrupo(db, {
      modulo_codigo: '0001',
      nombre: 'Presencial',
      modalidad: 'presencial'
    })
    const resultado = importarAlumnos(db, 'nombre;apellidos\nAna;García', grupo.id)
    expect(resultado.creados).toBe(1)
    expect(listarAlumnos(db, { grupoId: grupo.id })[0].grupos).toEqual([grupo.id])
  })
})

describe('entregas, mapeo a CE y notas', () => {
  beforeEach(() => {
    sembrarCiclos(db, [cicloPrueba])
  })

  it('crea una entrega y la mapea a criterios con pesos', () => {
    const entrega = crearEntrega(db, { modulo_codigo: '0001', titulo: 'Tarea 1' })
    const ceIds = (
      db.prepare('SELECT id FROM criterios_evaluacion ORDER BY id').all() as {
        id: number
      }[]
    ).map((c) => c.id)

    mapearCriterios(db, entrega.id, ceIds, { [ceIds[0]]: 3 })

    const criterios = listarCriteriosDeEntrega(db, entrega.id)
    expect(criterios).toHaveLength(3)
    expect(criterios.find((c) => c.ceId === ceIds[0])?.peso).toBe(3)
    expect(criterios.find((c) => c.ceId === ceIds[1])?.peso).toBe(1)
  })

  it('rechaza un código de módulo que no tiene cuatro dígitos', () => {
    expect(() => crearEntrega(db, { modulo_codigo: 'abc', titulo: 'X' })).toThrow()
  })

  it('calcula la nota de la entrega cruzando mapeo y notas', () => {
    const alumno = crearAlumno(db, { nombre: 'Ana', apellidos: 'García' })
    const entrega = crearEntrega(db, { modulo_codigo: '0001', titulo: 'Tarea 1' })
    const ceIds = (
      db.prepare('SELECT id FROM criterios_evaluacion ORDER BY id').all() as {
        id: number
      }[]
    ).map((c) => c.id)
    mapearCriterios(db, entrega.id, [ceIds[0], ceIds[1]], { [ceIds[0]]: 1, [ceIds[1]]: 1 })

    const eaId = asegurarEntregaAlumno(db, entrega.id, alumno.id)
    registrarNota(db, { entrega_alumno_id: eaId, ce_id: ceIds[0], nota: 10 })

    const resultado = calcularEntregaAlumno(db, entrega.id, alumno.id)
    // Un CE con 10 y otro sin corregir (0): media 5, incompleta.
    expect(resultado.nota).toBe(5)
    expect(resultado.completa).toBe(false)
    expect(resultado.ceSinNota).toEqual([ceIds[1]])
  })

  it('actualiza la nota si se registra dos veces el mismo CE', () => {
    const alumno = crearAlumno(db, { nombre: 'Ana', apellidos: 'García' })
    const entrega = crearEntrega(db, { modulo_codigo: '0001', titulo: 'Tarea 1' })
    const ceId = (
      db.prepare('SELECT id FROM criterios_evaluacion LIMIT 1').get() as {
        id: number
      }
    ).id
    mapearCriterios(db, entrega.id, [ceId])

    const eaId = asegurarEntregaAlumno(db, entrega.id, alumno.id)
    registrarNota(db, { entrega_alumno_id: eaId, ce_id: ceId, nota: 3 })
    registrarNota(db, { entrega_alumno_id: eaId, ce_id: ceId, nota: 9 })

    expect(calcularEntregaAlumno(db, entrega.id, alumno.id).nota).toBe(9)
  })

  it('rechaza notas fuera de la escala', () => {
    const alumno = crearAlumno(db, { nombre: 'Ana', apellidos: 'García' })
    const entrega = crearEntrega(db, { modulo_codigo: '0001', titulo: 'Tarea 1' })
    const ceId = (
      db.prepare('SELECT id FROM criterios_evaluacion LIMIT 1').get() as {
        id: number
      }
    ).id
    const eaId = asegurarEntregaAlumno(db, entrega.id, alumno.id)
    expect(() => registrarNota(db, { entrega_alumno_id: eaId, ce_id: ceId, nota: 11 })).toThrow()
  })
})

describe('resumen de calificaciones', () => {
  let alumno: { id: number }
  let grupo: { id: number }
  let ceIds: number[]

  beforeEach(() => {
    sembrarCiclos(db, [cicloPrueba])
    // RA1 = 50 % y RA2 = 50 % de la nota final.
    db.prepare(`UPDATE resultados_aprendizaje SET peso = 50 WHERE codigo = 'RA1'`).run()
    db.prepare(`UPDATE resultados_aprendizaje SET peso = 50 WHERE codigo = 'RA2'`).run()
    grupo = crearGrupo(db, { modulo_codigo: '0001', nombre: 'Presencial', modalidad: 'presencial' })
    alumno = crearAlumno(db, { nombre: 'Ana', apellidos: 'García', grupos: [grupo.id] })
    ceIds = (
      db.prepare('SELECT id FROM criterios_evaluacion ORDER BY id').all() as { id: number }[]
    ).map((c) => c.id)
  })

  it('calcula notas por entrega, por RA y final', () => {
    // Entrega 1 → RA1 (CE a y b); entrega 2 → RA2 (CE a del RA2).
    const e1 = crearEntrega(db, { modulo_codigo: '0001', titulo: 'E1', peso: 100 })
    mapearCriterios(db, e1.id, [ceIds[0], ceIds[1]])
    const e2 = crearEntrega(db, { modulo_codigo: '0001', titulo: 'E2', peso: 100 })
    mapearCriterios(db, e2.id, [ceIds[2]])

    const ea1 = asegurarEntregaAlumno(db, e1.id, alumno.id)
    registrarNota(db, { entrega_alumno_id: ea1, ce_id: ceIds[0], nota: 8 })
    registrarNota(db, { entrega_alumno_id: ea1, ce_id: ceIds[1], nota: 6 })
    const ea2 = asegurarEntregaAlumno(db, e2.id, alumno.id)
    registrarNota(db, { entrega_alumno_id: ea2, ce_id: ceIds[2], nota: 10 })

    const resumen = resumenModulo(db, grupo.id)
    expect(resumen.modulo.codigo).toBe('0001')
    expect(resumen.entregas).toHaveLength(2)

    const fila = resumen.filas[0]
    expect(fila.celdas[0].nota).toBe(7) // (8 + 6) / 2
    expect(fila.celdas[1].nota).toBe(10)
    expect(fila.ras[0].nota).toBe(7)
    expect(fila.ras[1].nota).toBe(10)
    expect(fila.final.nota).toBe(8.5) // 0,5·7 + 0,5·10
    expect(fila.final.aprobado).toBe(true)
    expect(fila.final.incompleta).toBe(false)
  })

  it('marca incompleta y avisa cuando falta la nota de un RA ponderado', () => {
    // Solo se corrige RA1; RA2 (50 %) queda sin nota.
    const e1 = crearEntrega(db, { modulo_codigo: '0001', titulo: 'E1', peso: 1 })
    mapearCriterios(db, e1.id, [ceIds[0]])
    const ea1 = asegurarEntregaAlumno(db, e1.id, alumno.id)
    registrarNota(db, { entrega_alumno_id: ea1, ce_id: ceIds[0], nota: 6 })

    const fila = resumenModulo(db, grupo.id).filas[0]
    expect(fila.final.incompleta).toBe(true)
    expect(fila.final.avisos.some((a) => a.includes('sin nota'))).toBe(true)
  })

  it('devuelve una fila por alumno matriculado en el grupo', () => {
    crearAlumno(db, { nombre: 'Luis', apellidos: 'Pérez', grupos: [grupo.id] })
    // Este alumno no está matriculado en el grupo: no debe aparecer.
    crearAlumno(db, { nombre: 'Eva', apellidos: 'Sanz' })
    expect(resumenModulo(db, grupo.id).filas).toHaveLength(2)
  })
})

describe('vaciar la base de datos', () => {
  it('borra los datos de trabajo y conserva el BOE', () => {
    sembrarCiclos(db, [cicloPrueba])
    const grupo = crearGrupo(db, {
      modulo_codigo: '0001',
      nombre: 'Presencial',
      modalidad: 'presencial'
    })
    const alumno = crearAlumno(db, { nombre: 'Ana', apellidos: 'García', grupos: [grupo.id] })
    const entrega = crearEntrega(db, { modulo_codigo: '0001', titulo: 'E1' })
    const ceId = (
      db.prepare('SELECT id FROM criterios_evaluacion LIMIT 1').get() as {
        id: number
      }
    ).id
    const eaId = asegurarEntregaAlumno(db, entrega.id, alumno.id)
    registrarNota(db, { entrega_alumno_id: eaId, ce_id: ceId, nota: 5 })

    vaciarDatos(db)

    expect(listarAlumnos(db)).toHaveLength(0)
    expect(listarGrupos(db)).toHaveLength(0)
    expect(listarEntregas(db, '0001')).toHaveLength(0)
    // Los datos del BOE se conservan.
    expect(contarBoe(db)).toEqual({ ciclos: 1, modulos: 1, ra: 2, ce: 3 })
  })
})

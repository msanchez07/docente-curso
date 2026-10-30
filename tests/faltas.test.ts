import { beforeEach, describe, expect, it } from 'vitest'
import type { Ciclo } from '@shared/tipos'
import { abrirBd, type Bd } from '../src/main/db/conexion'
import { sembrarCiclos } from '../src/main/db/seed'
import { crearGrupoClase } from '../src/main/db/repositorios/grupos-clase'
import { crearAlumnoEnGrupoClase } from '../src/main/db/repositorios/alumnos-clase'
import {
  guardarAjustesFaltas,
  guardarModuloFaltas,
  importarInformeFaltas,
  listarCursosFaltas,
  listarInformesFaltas,
  obtenerCursoFaltas,
  obtenerInformeFaltas
} from '../src/main/db/repositorios/faltas'

const ciclo: Ciclo = {
  id: 'daw',
  denominacion: 'Desarrollo de Aplicaciones Web',
  nivel: 'Formación Profesional de Grado Superior',
  familia_profesional: 'Informática y Comunicaciones',
  duracion_horas: 2000,
  ects: 120,
  rd: 'RD de prueba',
  boe_url: 'https://www.boe.es/',
  modulos: [
    {
      codigo: '0613',
      nombre: 'Desarrollo Web en entorno servidor',
      siglas: 'DWES',
      curso: '2',
      ects: 12,
      horas_minimas_boe: 100,
      ra: []
    }
  ]
}

let db: Bd
let grupoId: number
let alumnoId: number

beforeEach(() => {
  db = abrirBd(':memory:')
  sembrarCiclos(db, [ciclo])
  const grupo = crearGrupoClase(db, {
    ciclo_id: 'daw',
    curso: '2',
    modalidad: 'presencial',
    modulo_codigo: '0613'
  })
  grupoId = grupo.id
  const alumno = crearAlumnoEnGrupoClase(db, grupo.id, {
    nombre: 'Ana',
    apellidos: 'García',
    dni: '11111111H'
  })
  alumnoId = alumno.alumno.id
})

const clave = {
  cursoAcademicoId: 1,
  cicloId: 'daw',
  curso: '2' as const,
  modalidad: 'presencial' as const
}

describe('control de faltas por curso', () => {
  it('describe el curso con todos sus módulos y alumnado', () => {
    const cursos = listarCursosFaltas(db)
    expect(cursos).toHaveLength(1)
    const datos = obtenerCursoFaltas(db, clave)
    expect(datos.modulos).toHaveLength(1)
    expect(datos.modulos[0].horas).toBe(100)
    expect(datos.modulos[0].nombreInforme).toBe('DWES')
    expect(datos.alumnos[0].nombre).toBe('Ana')
  })

  it('permite configurar nombre de informe, horas y ajustes', () => {
    guardarModuloFaltas(db, clave, '0613', 'DWES ITACA', 120)
    const datos = guardarAjustesFaltas(db, clave, 10, true)
    expect(datos.modulos[0].nombreInforme).toBe('DWES ITACA')
    expect(datos.modulos[0].horas).toBe(120)
    expect(datos.limite).toBe(10)
    expect(datos.incluirJustificadas).toBe(true)
  })

  it('guarda cada informe como una entrada del historial', () => {
    const curso = obtenerCursoFaltas(db, clave)
    const informe = importarInformeFaltas(db, clave, 'faltas-octubre.pdf', {
      modulos: curso.modulos,
      alumnos: [{ alumnoId, faltas: { '0613': 4 } }],
      limite: 15,
      incluirJustificadas: false
    })
    expect(informe.archivo).toBe('faltas-octubre.pdf')
    expect(listarInformesFaltas(db, clave)).toHaveLength(1)
    expect(obtenerInformeFaltas(db, informe.id)?.datos.alumnos[0].faltas['0613']).toBe(4)
  })
})

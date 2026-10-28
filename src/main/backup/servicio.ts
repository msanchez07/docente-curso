/**
 * Copias de seguridad por grupo de clase.
 *
 * La carpeta raíz se configura una vez para toda la aplicación. Dentro se crea
 * una subcarpeta por curso académico y, dentro, un JSON autocontenido por grupo
 * y fecha. El JSON incluye alumnado, criterios, entregas, notas, evidencias,
 * programación, unidades, eventos y formación; los archivos van en base64.
 */
import { app, dialog, shell } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ArchivoBackup, EstadoBackup, ResultadoBackup } from '@shared/tipos'
import { obtenerBd } from '../bd'
import type { Bd } from '../db/conexion'

const FORMATO = 'docente-curso-grupo'
const VERSION = 1
const CLAVE_CARPETA = 'backup_carpeta'

type Fila = Record<string, unknown>
type Tabla =
  | 'grupos_clase'
  | 'alumnos'
  | 'matriculas_clase'
  | 'criterios_grupo_clase'
  | 'entregas_clase'
  | 'entrega_ce_clase'
  | 'notas_entrega_clase'
  | 'anotaciones_entrega_clase'
  | 'archivos_entrega_clase'
  | 'programacion_aula'
  | 'unidades_programacion'
  | 'unidad_programacion_ra'
  | 'eventos_evaluacion_clase'
  | 'formacion_empresa'
  | 'calendario_escolar'

interface DatosBackup {
  formato: string
  version: number
  generado_en: string
  huella: string
  curso: Fila
  grupo: Fila
  alumnos: Fila[]
  matriculas: Fila[]
  criterios: Fila[]
  entregas: Fila[]
  entrega_ce: Fila[]
  notas: Fila[]
  anotaciones: Fila[]
  evidencias: Fila[]
  programacion: Fila[]
  unidades: Fila[]
  unidad_ra: Fila[]
  eventos: Fila[]
  formacion: Fila[]
  calendario: Fila[]
}

function filas(db: Bd, sql: string, ...params: unknown[]): Fila[] {
  return db.prepare(sql).all(...params) as Fila[]
}

function fila(db: Bd, sql: string, ...params: unknown[]): Fila | null {
  return (db.prepare(sql).get(...params) as Fila | undefined) ?? null
}

function nombreSeguro(texto: string): string {
  return (
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'sin-nombre'
  )
}

function marcaTiempo(fecha = new Date()): string {
  const dos = (numero: number): string => String(numero).padStart(2, '0')
  return `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}-${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`
}

function leerConfig(db: Bd, clave: string): string | null {
  const resultado = fila(db, 'SELECT valor FROM config WHERE clave = ?', clave)
  return typeof resultado?.valor === 'string' ? resultado.valor : null
}

function escribirConfig(db: Bd, clave: string, valor: string): void {
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(clave, valor)
}

function carpetaRecomendada(): string {
  return join(app.getPath('documents'), 'Docente Curso Backups')
}

function carpetaConfigurada(db: Bd): string | null {
  return leerConfig(db, CLAVE_CARPETA)
}

async function carpetaDisponible(carpeta: string | null): Promise<boolean> {
  if (!carpeta) return false
  try {
    return (await stat(carpeta)).isDirectory()
  } catch {
    return false
  }
}

async function listarArchivosJson(carpeta: string): Promise<string[]> {
  if (!(await carpetaDisponible(carpeta))) return []
  const resultado: string[] = []
  const entradas = await readdir(carpeta, { withFileTypes: true })
  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue
    const subcarpeta = join(carpeta, entrada.name)
    let hijos
    try {
      hijos = await readdir(subcarpeta, { withFileTypes: true })
    } catch {
      continue
    }
    for (const hijo of hijos) {
      if (hijo.isFile() && hijo.name.toLowerCase().endsWith('.json')) {
        resultado.push(join(subcarpeta, hijo.name))
      }
    }
  }
  return resultado
}

async function leerArchivoBackup(ruta: string): Promise<ArchivoBackup | null> {
  try {
    const info = await stat(ruta)
    const contenido = JSON.parse(await readFile(ruta, 'utf-8')) as Partial<DatosBackup>
    if (contenido.formato !== FORMATO) return null
    const grupo = contenido.grupo as Fila | undefined
    const curso = contenido.curso as Fila | undefined
    return {
      archivo: ruta.split(/[\\/]/).pop() ?? ruta,
      ruta,
      grupo_id: typeof grupo?.id === 'number' ? grupo.id : null,
      grupo_nombre: typeof grupo?.nombre === 'string' ? grupo.nombre : 'Grupo sin nombre',
      curso: typeof curso?.nombre === 'string' ? curso.nombre : 'Curso desconocido',
      generado_en: typeof contenido.generado_en === 'string' ? contenido.generado_en : '',
      tamano: info.size
    }
  } catch {
    return null
  }
}

export async function estadoBackup(): Promise<EstadoBackup> {
  const db = obtenerBd()
  const grupos = Number(fila(db, 'SELECT COUNT(*) AS total FROM grupos_clase')?.total ?? 0)
  const carpeta = carpetaConfigurada(db)
  const existe = await carpetaDisponible(carpeta)
  const archivos = carpeta && existe ? await listarArchivosJson(carpeta) : []
  return {
    carpeta: carpeta ?? carpetaRecomendada(),
    existe,
    configurada: Boolean(carpeta),
    grupos,
    backups: archivos.length,
    mensaje: !carpeta
      ? 'Configura una carpeta para las copias de seguridad.'
      : !existe
        ? 'La carpeta de copias configurada ya no existe.'
        : undefined
  }
}

export async function elegirCarpetaBackup(): Promise<EstadoBackup | null> {
  const db = obtenerBd()
  const actual = carpetaConfigurada(db) ?? carpetaRecomendada()
  const resultado = await dialog.showOpenDialog({
    title: 'Elegir carpeta de copias de seguridad',
    defaultPath: actual,
    properties: ['openDirectory', 'createDirectory']
  })
  if (resultado.canceled || !resultado.filePaths[0]) return null
  const carpeta = resultado.filePaths[0]
  await mkdir(carpeta, { recursive: true })
  escribirConfig(db, CLAVE_CARPETA, carpeta)
  return estadoBackup()
}

export async function usarCarpetaRecomendada(): Promise<EstadoBackup> {
  const db = obtenerBd()
  const carpeta = carpetaRecomendada()
  await mkdir(carpeta, { recursive: true })
  escribirConfig(db, CLAVE_CARPETA, carpeta)
  return estadoBackup()
}

export async function abrirCarpetaBackup(): Promise<boolean> {
  const db = obtenerBd()
  const carpeta = carpetaConfigurada(db)
  if (!carpeta || !(await carpetaDisponible(carpeta))) return false
  const resultado = await shell.openPath(carpeta)
  return resultado === ''
}

export async function listarBackups(): Promise<ArchivoBackup[]> {
  const db = obtenerBd()
  const carpeta = carpetaConfigurada(db)
  if (!carpeta || !(await carpetaDisponible(carpeta))) return []
  const rutas = await listarArchivosJson(carpeta)
  const archivos = await Promise.all(rutas.map(leerArchivoBackup))
  return archivos
    .filter((archivo): archivo is ArchivoBackup => archivo !== null)
    .sort((a, b) => (b.generado_en ?? '').localeCompare(a.generado_en ?? ''))
}

function datosDeGrupo(grupoId: number): DatosBackup {
  const db = obtenerBd()
  const grupo = fila(db, 'SELECT * FROM grupos_clase WHERE id = ?', grupoId)
  if (!grupo) throw new Error('El grupo no existe.')
  const curso = fila(db, 'SELECT * FROM cursos_academicos WHERE id = ?', grupo.curso_academico_id)
  if (!curso) throw new Error('El curso académico del grupo no existe.')

  const alumnos = filas(
    db,
    `SELECT a.* FROM alumnos a
       JOIN matriculas_clase m ON m.alumno_id = a.id
      WHERE m.grupo_clase_id = ?
      ORDER BY a.id`,
    grupoId
  )
  const matriculas = filas(
    db,
    'SELECT alumno_id FROM matriculas_clase WHERE grupo_clase_id = ? ORDER BY alumno_id',
    grupoId
  )
  const criterios = filas(
    db,
    'SELECT * FROM criterios_grupo_clase WHERE grupo_clase_id = ?',
    grupoId
  )
  const entregas = filas(
    db,
    'SELECT * FROM entregas_clase WHERE grupo_clase_id = ? ORDER BY id',
    grupoId
  )
  const entregaCe = filas(
    db,
    `SELECT ec.* FROM entrega_ce_clase ec
       JOIN entregas_clase e ON e.id = ec.entrega_id
      WHERE e.grupo_clase_id = ?
      ORDER BY ec.entrega_id, ec.ce_id`,
    grupoId
  )
  const notas = filas(
    db,
    `SELECT n.* FROM notas_entrega_clase n
       JOIN entregas_clase e ON e.id = n.entrega_id
      WHERE e.grupo_clase_id = ?
      ORDER BY n.entrega_id, n.alumno_id`,
    grupoId
  )
  const anotaciones = filas(
    db,
    `SELECT a.* FROM anotaciones_entrega_clase a
       JOIN entregas_clase e ON e.id = a.entrega_id
      WHERE e.grupo_clase_id = ?
      ORDER BY a.entrega_id, a.alumno_id`,
    grupoId
  )
  const evidencias = filas(
    db,
    `SELECT av.* FROM archivos_entrega_clase av
       JOIN entregas_clase e ON e.id = av.entrega_id
      WHERE e.grupo_clase_id = ?
      ORDER BY av.entrega_id, av.id`,
    grupoId
  )
  const programacion = filas(
    db,
    'SELECT * FROM programacion_aula WHERE grupo_clase_id = ? ORDER BY fecha, orden, id',
    grupoId
  )
  const unidades = filas(
    db,
    'SELECT * FROM unidades_programacion WHERE grupo_clase_id = ? ORDER BY id',
    grupoId
  )
  const unidadRa = filas(
    db,
    `SELECT ur.* FROM unidad_programacion_ra ur
       JOIN unidades_programacion u ON u.id = ur.unidad_id
      WHERE u.grupo_clase_id = ?
      ORDER BY ur.unidad_id, ur.ra_codigo`,
    grupoId
  )
  const eventos = filas(
    db,
    'SELECT * FROM eventos_evaluacion_clase WHERE grupo_clase_id = ? ORDER BY fecha, id',
    grupoId
  )
  const formacion = filas(
    db,
    'SELECT * FROM formacion_empresa WHERE grupo_clase_id = ? ORDER BY id',
    grupoId
  )
  const calendario = filas(
    db,
    'SELECT * FROM calendario_escolar WHERE curso_academico_id = ? ORDER BY fecha',
    curso.id
  )

  const base = {
    formato: FORMATO,
    version: VERSION,
    curso,
    grupo,
    alumnos,
    matriculas,
    criterios,
    entregas,
    entrega_ce: entregaCe,
    notas,
    anotaciones,
    evidencias,
    programacion,
    unidades,
    unidad_ra: unidadRa,
    eventos,
    formacion,
    calendario
  }
  const huella = createHash('sha256').update(JSON.stringify(base)).digest('hex')
  return {
    ...base,
    generado_en: new Date().toISOString(),
    huella
  }
}

async function escribirBackup(datos: DatosBackup, grupoId: number): Promise<string> {
  const db = obtenerBd()
  const carpeta = carpetaConfigurada(db)
  if (!carpeta) throw new Error('No hay una carpeta de copias configurada.')
  if (!(await carpetaDisponible(carpeta))) {
    throw new Error('La carpeta de copias ya no existe. Elige otra carpeta.')
  }
  const nombreCurso = nombreSeguro(String(datos.curso.nombre ?? 'curso'))
  const carpetaCurso = join(carpeta, nombreCurso)
  await mkdir(carpetaCurso, { recursive: true })
  const grupo = datos.grupo as Fila
  const archivo = `${nombreSeguro(String(grupo.nombre ?? `grupo-${grupoId}`))}-${marcaTiempo()}.json`
  const ruta = join(carpetaCurso, archivo)
  await writeFile(ruta, `${JSON.stringify(datos, null, 2)}\n`, 'utf-8')
  escribirConfig(db, `backup_hash:${grupoId}`, datos.huella)
  escribirConfig(db, `backup_archivo:${grupoId}`, ruta)
  escribirConfig(db, `backup_ultimo:${grupoId}`, datos.generado_en)
  return ruta
}

export async function crearBackupGrupo(grupoId: number): Promise<ResultadoBackup> {
  try {
    const datos = datosDeGrupo(grupoId)
    const ruta = await escribirBackup(datos, grupoId)
    return { ok: true, ruta, grupo_id: grupoId, mensaje: 'Copia creada.' }
  } catch (e) {
    return { ok: false, grupo_id: grupoId, mensaje: (e as Error).message ?? String(e) }
  }
}

export async function crearBackupsTodos(): Promise<ResultadoBackup[]> {
  const db = obtenerBd()
  const grupos = filas(db, 'SELECT id FROM grupos_clase ORDER BY id') as { id: number }[]
  return Promise.all(grupos.map((grupo) => crearBackupGrupo(Number(grupo.id))))
}

/** Crea back ups automáticos solo para grupos cuyo contenido cambió o cuyo archivo desapareció. */
export async function backupAutomatico(): Promise<ResultadoBackup[]> {
  const db = obtenerBd()
  const carpeta = carpetaConfigurada(db)
  if (!carpeta || !(await carpetaDisponible(carpeta))) return []
  const grupos = filas(db, 'SELECT id FROM grupos_clase ORDER BY id') as { id: number }[]
  const resultados: ResultadoBackup[] = []
  for (const grupo of grupos) {
    const grupoId = Number(grupo.id)
    try {
      const datos = datosDeGrupo(grupoId)
      const hashAnterior = leerConfig(db, `backup_hash:${grupoId}`)
      const rutaAnterior = leerConfig(db, `backup_archivo:${grupoId}`)
      if (hashAnterior === datos.huella && rutaAnterior && existsSync(rutaAnterior)) continue
      const ruta = await escribirBackup(datos, grupoId)
      resultados.push({
        ok: true,
        ruta,
        grupo_id: grupoId,
        mensaje: 'Copia automática creada.'
      })
    } catch (e) {
      resultados.push({
        ok: false,
        grupo_id: grupoId,
        mensaje: (e as Error).message ?? String(e)
      })
    }
  }
  return resultados
}

/* --- Importación ------------------------------------------------------ */

function insertarFila(db: Bd, tabla: Tabla, fila: Fila): number {
  const columnas = (db.prepare(`PRAGMA table_info(${tabla})`).all() as { name: string }[]).map(
    (columna) => columna.name
  )
  const validas = Object.keys(fila).filter(
    (columna) => columnas.includes(columna) && fila[columna] !== undefined
  )
  if (validas.length === 0) throw new Error('La copia no contiene datos válidos.')
  const sql = `INSERT INTO ${tabla} (${validas.map((c) => `"${c}"`).join(', ')})
               VALUES (${validas.map(() => '?').join(', ')})`
  return Number(db.prepare(sql).run(...validas.map((columna) => fila[columna])).lastInsertRowid)
}

function asegurarCurso(db: Bd, curso: Fila): number {
  const inicio = Number(curso.inicio)
  const fin = Number(curso.fin)
  const existente = fila(
    db,
    'SELECT id FROM cursos_academicos WHERE nombre = ? OR (inicio = ? AND fin = ?)',
    String(curso.nombre ?? ''),
    inicio,
    fin
  )
  if (existente) return Number(existente.id)
  const actual = fila(db, 'SELECT id FROM cursos_academicos WHERE actual = 1')
  const resultado = db
    .prepare(
      'INSERT INTO cursos_academicos (nombre, inicio, fin, actual, creado_en) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      String(curso.nombre ?? `${inicio}/${fin}`),
      inicio,
      fin,
      actual ? 0 : curso.actual ? 1 : 0,
      String(curso.creado_en ?? new Date().toISOString())
    )
  return Number(resultado.lastInsertRowid)
}

function alumnoExistente(db: Bd, alumno: Fila): number | null {
  const dni = typeof alumno.dni === 'string' ? alumno.dni.trim() : ''
  if (dni) {
    const encontrado = fila(db, 'SELECT id FROM alumnos WHERE dni = ? COLLATE NOCASE', dni)
    if (encontrado) return Number(encontrado.id)
  }
  const email = typeof alumno.email === 'string' ? alumno.email.trim() : ''
  if (email) {
    const encontrado = fila(db, 'SELECT id FROM alumnos WHERE email = ? COLLATE NOCASE', email)
    if (encontrado) return Number(encontrado.id)
  }
  const encontrado = fila(
    db,
    'SELECT id FROM alumnos WHERE nombre = ? COLLATE NOCASE AND apellidos = ? COLLATE NOCASE',
    String(alumno.nombre ?? ''),
    String(alumno.apellidos ?? '')
  )
  return encontrado ? Number(encontrado.id) : null
}

export async function importarBackupDesdeRuta(ruta: string): Promise<ResultadoBackup> {
  const db = obtenerBd()
  let datos: Partial<DatosBackup>
  try {
    datos = JSON.parse(await readFile(ruta, 'utf-8')) as Partial<DatosBackup>
  } catch {
    return { ok: false, mensaje: 'No se ha podido leer el archivo de copia.' }
  }
  if (datos.formato !== FORMATO || datos.version !== VERSION) {
    return { ok: false, mensaje: 'El archivo no es una copia compatible de Docente Curso.' }
  }
  if (!datos.curso || !datos.grupo) {
    return { ok: false, mensaje: 'La copia no contiene los datos mínimos del grupo.' }
  }

  try {
    const grupoId = db.transaction(() => {
      const cursoId = asegurarCurso(db, datos.curso as Fila)
      const grupo = datos.grupo as Fila
      const existente = fila(
        db,
        `SELECT id FROM grupos_clase
          WHERE curso_academico_id = ? AND ciclo_id = ? AND curso = ? AND modalidad = ?
            AND modulo_codigo = ?`,
        cursoId,
        String(grupo.ciclo_id ?? ''),
        String(grupo.curso ?? ''),
        String(grupo.modalidad ?? ''),
        String(grupo.modulo_codigo ?? '')
      )
      if (existente) {
        db.prepare('DELETE FROM grupos_clase WHERE id = ?').run(Number(existente.id))
      }

      const grupoSinId = { ...grupo }
      delete grupoSinId.id
      const nuevoGrupoId = insertarFila(db, 'grupos_clase', {
        ...grupoSinId,
        curso_academico_id: cursoId
      })

      const alumnosImportados = new Map<number, number>()
      for (const alumno of datos.alumnos ?? []) {
        const previo = alumnoExistente(db, alumno)
        const alumnoSinId = { ...alumno }
        delete alumnoSinId.id
        let alumnoId: number = previo ?? 0
        if (previo) {
          db.prepare(
            `UPDATE alumnos
                SET nombre = ?, apellidos = ?, dni = ?, email = ?, activo = ?
              WHERE id = ?`
          ).run(
            String(alumno.nombre ?? ''),
            String(alumno.apellidos ?? ''),
            alumno.dni ?? null,
            alumno.email ?? null,
            Number(alumno.activo ?? 1),
            previo
          )
        } else {
          alumnoId = insertarFila(db, 'alumnos', alumnoSinId)
        }
        alumnosImportados.set(Number(alumno.id), alumnoId)
        db.prepare(
          'INSERT OR IGNORE INTO matriculas_clase (alumno_id, grupo_clase_id) VALUES (?, ?)'
        ).run(alumnoId, nuevoGrupoId)
      }

      for (const criterio of datos.criterios ?? []) {
        insertarFila(db, 'criterios_grupo_clase', {
          ...criterio,
          grupo_clase_id: nuevoGrupoId
        })
      }

      const entregasImportadas = new Map<number, number>()
      for (const entrega of datos.entregas ?? []) {
        const entregaSinId = { ...entrega }
        const idAnterior = Number(entregaSinId.id)
        delete entregaSinId.id
        const nueva = insertarFila(db, 'entregas_clase', {
          ...entregaSinId,
          grupo_clase_id: nuevoGrupoId
        })
        entregasImportadas.set(idAnterior, nueva)
      }

      for (const mapeo of datos.entrega_ce ?? []) {
        const entregaId = entregasImportadas.get(Number(mapeo.entrega_id))
        if (!entregaId) continue
        insertarFila(db, 'entrega_ce_clase', {
          ...mapeo,
          entrega_id: entregaId
        })
      }

      for (const nota of datos.notas ?? []) {
        const entregaId = entregasImportadas.get(Number(nota.entrega_id))
        const alumnoId = alumnosImportados.get(Number(nota.alumno_id))
        if (!entregaId || !alumnoId) continue
        insertarFila(db, 'notas_entrega_clase', {
          ...nota,
          entrega_id: entregaId,
          alumno_id: alumnoId
        })
      }

      for (const anotacion of datos.anotaciones ?? []) {
        const entregaId = entregasImportadas.get(Number(anotacion.entrega_id))
        const alumnoId = alumnosImportados.get(Number(anotacion.alumno_id))
        if (!entregaId || !alumnoId) continue
        insertarFila(db, 'anotaciones_entrega_clase', {
          ...anotacion,
          entrega_id: entregaId,
          alumno_id: alumnoId
        })
      }

      for (const evidencia of datos.evidencias ?? []) {
        const entregaId = entregasImportadas.get(Number(evidencia.entrega_id))
        if (!entregaId) continue
        const evidenciaSinId = { ...evidencia }
        delete evidenciaSinId.id
        insertarFila(db, 'archivos_entrega_clase', {
          ...evidenciaSinId,
          entrega_id: entregaId
        })
      }

      const unidadesImportadas = new Map<number, number>()
      for (const unidad of datos.unidades ?? []) {
        const unidadSinId = { ...unidad }
        const idAnterior = Number(unidadSinId.id)
        delete unidadSinId.id
        const nueva = insertarFila(db, 'unidades_programacion', {
          ...unidadSinId,
          grupo_clase_id: nuevoGrupoId
        })
        unidadesImportadas.set(idAnterior, nueva)
      }

      for (const unidadRa of datos.unidad_ra ?? []) {
        const unidadId = unidadesImportadas.get(Number(unidadRa.unidad_id))
        if (!unidadId) continue
        insertarFila(db, 'unidad_programacion_ra', {
          ...unidadRa,
          unidad_id: unidadId
        })
      }

      for (const sesion of datos.programacion ?? []) {
        const sesionSinId = { ...sesion }
        delete sesionSinId.id
        const unidadAnterior = sesionSinId.unidad_id
        const unidadId =
          unidadAnterior === null || unidadAnterior === undefined
            ? null
            : (unidadesImportadas.get(Number(unidadAnterior)) ?? null)
        insertarFila(db, 'programacion_aula', {
          ...sesionSinId,
          grupo_clase_id: nuevoGrupoId,
          unidad_id: unidadId
        })
      }

      for (const evento of datos.eventos ?? []) {
        const eventoSinId = { ...evento }
        delete eventoSinId.id
        insertarFila(db, 'eventos_evaluacion_clase', {
          ...eventoSinId,
          grupo_clase_id: nuevoGrupoId
        })
      }

      for (const periodo of datos.formacion ?? []) {
        const periodoSinId = { ...periodo }
        delete periodoSinId.id
        const alumnoId = alumnosImportados.get(Number(periodoSinId.alumno_id))
        if (!alumnoId) continue
        insertarFila(db, 'formacion_empresa', {
          ...periodoSinId,
          grupo_clase_id: nuevoGrupoId,
          alumno_id: alumnoId
        })
      }

      for (const dia of datos.calendario ?? []) {
        db.prepare(
          `INSERT INTO calendario_escolar
             (curso_academico_id, fecha, tipo, descripcion, creado_en, actualizado_en)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(curso_academico_id, fecha) DO UPDATE SET
             tipo = excluded.tipo,
             descripcion = excluded.descripcion,
             actualizado_en = excluded.actualizado_en`
        ).run(
          cursoId,
          String(dia.fecha ?? ''),
          String(dia.tipo ?? 'no_lectivo'),
          dia.descripcion ?? null,
          String(dia.creado_en ?? new Date().toISOString()),
          String(dia.actualizado_en ?? new Date().toISOString())
        )
      }

      return nuevoGrupoId
    })()
    return { ok: true, grupo_id: grupoId, mensaje: 'Copia importada.' }
  } catch (e) {
    return { ok: false, mensaje: (e as Error).message ?? String(e) }
  }
}

export async function importarBackupConDialogo(ruta?: string): Promise<ResultadoBackup> {
  if (ruta) return importarBackupDesdeRuta(ruta)
  const db = obtenerBd()
  const carpeta = carpetaConfigurada(db) ?? app.getPath('documents')
  const resultado = await dialog.showOpenDialog({
    title: 'Importar copia de seguridad de un grupo',
    defaultPath: carpeta,
    properties: ['openFile'],
    filters: [{ name: 'Copias de Docente Curso', extensions: ['json'] }]
  })
  if (resultado.canceled || !resultado.filePaths[0]) {
    return { ok: false, mensaje: 'Importación cancelada.' }
  }
  return importarBackupDesdeRuta(resultado.filePaths[0])
}

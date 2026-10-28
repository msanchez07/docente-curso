/**
 * Mantenimiento de la base de datos: vaciar los datos de trabajo.
 *
 * Se borran grupos, matrículas, alumnado, entregas, notas y los criterios de
 * calificación (que se guardan en `config`). Los datos del BOE (ciclos,
 * módulos, RA y CE) se conservan, así que la aplicación queda lista para
 * empezar un curso nuevo.
 */
import type { Bd } from './conexion'

export function vaciarDatos(db: Bd): void {
  db.transaction(() => {
    db.exec(`
      DELETE FROM notas;
      DELETE FROM entregas_alumno;
      DELETE FROM entrega_ce;
      DELETE FROM entregas;
      DELETE FROM matriculas;
      DELETE FROM matriculas_clase;
      DELETE FROM criterios_grupo_clase;
      DELETE FROM plantillas_criterios;
      DELETE FROM programacion_aula;
      DELETE FROM entregas_clase;
      DELETE FROM notas_entrega_clase;
      DELETE FROM anotaciones_entrega_clase;
      DELETE FROM grupos_clase;
      DELETE FROM grupos;
      DELETE FROM alumnos;
      DELETE FROM config WHERE clave <> 'backup_carpeta';
    `)
  })()
  db.pragma('wal_checkpoint(TRUNCATE)')
}

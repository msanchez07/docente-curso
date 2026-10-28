-- Migración v16: rúbrica de la entrega y anotaciones por alumno.
--
-- La rúbrica se guarda como texto libre (criterios y niveles) asociada a la
-- entrega. Las anotaciones son texto por entrega y alumno, independientes de
-- la nota numérica.

ALTER TABLE entregas_clase ADD COLUMN rubrica TEXT;

CREATE TABLE IF NOT EXISTS anotaciones_entrega_clase (
  entrega_id      INTEGER NOT NULL REFERENCES entregas_clase(id) ON DELETE CASCADE,
  alumno_id       INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  texto           TEXT NOT NULL,
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (entrega_id, alumno_id)
);

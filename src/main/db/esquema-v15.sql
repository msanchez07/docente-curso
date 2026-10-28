-- Migración v15: notas directas de cada entrega por alumno.
--
-- La nota es por entrega (0–10). La trazabilidad por CE se conserva en el
-- mapeo de la entrega; el cálculo de la categoría usa la media simple.

CREATE TABLE IF NOT EXISTS notas_entrega_clase (
  entrega_id      INTEGER NOT NULL REFERENCES entregas_clase(id) ON DELETE CASCADE,
  alumno_id       INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  nota            REAL NOT NULL CHECK (nota >= 0 AND nota <= 10),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (entrega_id, alumno_id)
);

CREATE INDEX IF NOT EXISTS idx_notas_clase_alumno
  ON notas_entrega_clase(alumno_id);

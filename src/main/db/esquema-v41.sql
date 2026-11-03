-- Migración v41: fechas de tipo «otras» además de evaluación y examen.

PRAGMA foreign_keys = OFF;

CREATE TABLE eventos_evaluacion_clase_nuevo (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grupo_clase_id  INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('evaluacion', 'examen', 'otro')),
  titulo          TEXT NOT NULL,
  fecha           TEXT NOT NULL,
  hora            TEXT,
  avaluacion_id   TEXT,
  observaciones   TEXT,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO eventos_evaluacion_clase_nuevo
  (id, grupo_clase_id, tipo, titulo, fecha, hora, avaluacion_id, observaciones, creado_en, actualizado_en)
SELECT id, grupo_clase_id, tipo, titulo, fecha, hora, avaluacion_id, observaciones, creado_en, actualizado_en
FROM eventos_evaluacion_clase;

DROP TABLE eventos_evaluacion_clase;
ALTER TABLE eventos_evaluacion_clase_nuevo RENAME TO eventos_evaluacion_clase;

CREATE INDEX IF NOT EXISTS idx_eventos_evaluacion_grupo
  ON eventos_evaluacion_clase(grupo_clase_id, fecha);

PRAGMA foreign_keys = ON;

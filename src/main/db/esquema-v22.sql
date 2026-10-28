-- Migración v22: fechas de evaluaciones y exámenes por grupo de clase.

CREATE TABLE IF NOT EXISTS eventos_evaluacion_clase (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grupo_clase_id  INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('evaluacion', 'examen')),
  titulo          TEXT NOT NULL,
  fecha           TEXT NOT NULL,
  hora            TEXT,
  avaluacion_id   TEXT,
  observaciones   TEXT,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_eventos_evaluacion_grupo
  ON eventos_evaluacion_clase(grupo_clase_id, fecha);

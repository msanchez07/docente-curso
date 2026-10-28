-- Migración v13: programación de aula por grupo.
--
-- Cada fila es un día (o una sesión) con lo que se ha hecho, la desviación
-- respecto a la planificación y observaciones libres.

CREATE TABLE IF NOT EXISTS programacion_aula (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grupo_clase_id  INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  fecha           TEXT NOT NULL,
  contenido       TEXT NOT NULL DEFAULT '',
  desviacion      TEXT NOT NULL DEFAULT '',
  observaciones   TEXT NOT NULL DEFAULT '',
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_programacion_grupo_fecha
  ON programacion_aula(grupo_clase_id, fecha, id);

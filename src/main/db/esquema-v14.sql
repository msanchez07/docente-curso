-- Migración v14: entregas por grupo de clase y su mapeo a RA/CE.
--
-- La entrega pertenece al grupo (no al módulo suelto), se ubica en una
-- avaluación y una categoría de los criterios del grupo, y se mapea a los CE
-- oficiales del módulo.

CREATE TABLE IF NOT EXISTS entregas_clase (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grupo_clase_id  INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  tipo            TEXT NOT NULL DEFAULT 'tarea',
  fecha_limite    TEXT,
  avaluacion_id   TEXT NOT NULL,
  categoria_id    TEXT NOT NULL,
  creada_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entregas_clase_grupo
  ON entregas_clase(grupo_clase_id);

CREATE TABLE IF NOT EXISTS entrega_ce_clase (
  entrega_id  INTEGER NOT NULL REFERENCES entregas_clase(id) ON DELETE CASCADE,
  ce_id       INTEGER NOT NULL REFERENCES criterios_evaluacion(id) ON DELETE CASCADE,
  PRIMARY KEY (entrega_id, ce_id)
);

CREATE INDEX IF NOT EXISTS idx_entrega_ce_clase_ce
  ON entrega_ce_clase(ce_id);

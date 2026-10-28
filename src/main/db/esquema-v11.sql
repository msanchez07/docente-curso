-- Migración v11: criterios de calificación por grupo de clase.
--
-- Cada grupo guarda su propio modelo (avaluaciones, categorías, mínimos y
-- convocatorias) en un JSON versionado. El modelo se edita y se guarda entero.

CREATE TABLE IF NOT EXISTS criterios_grupo_clase (
  grupo_clase_id  INTEGER PRIMARY KEY REFERENCES grupos_clase(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,
  modelo          TEXT NOT NULL,
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

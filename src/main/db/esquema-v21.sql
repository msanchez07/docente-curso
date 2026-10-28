-- Migración v21: periodos de formación en empresa por alumno y grupo.
--
-- Un alumno puede tener varios periodos (FCT, formación dual…). Cada periodo
-- pertenece al grupo de clase en el que está matriculado.

CREATE TABLE IF NOT EXISTS formacion_empresa (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grupo_clase_id  INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  alumno_id       INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  fecha_inicio    TEXT NOT NULL,
  fecha_fin       TEXT NOT NULL,
  empresa         TEXT NOT NULL,
  observaciones   TEXT,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_formacion_empresa_grupo
  ON formacion_empresa(grupo_clase_id);
CREATE INDEX IF NOT EXISTS idx_formacion_empresa_alumno
  ON formacion_empresa(alumno_id);

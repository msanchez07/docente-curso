-- Migración v23: unidades de programación y calendario escolar.

CREATE TABLE IF NOT EXISTS unidades_programacion (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grupo_clase_id  INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  codigo          TEXT,
  nombre          TEXT NOT NULL,
  fecha_inicio    TEXT,
  fecha_fin       TEXT,
  contenidos      TEXT NOT NULL DEFAULT '',
  observaciones   TEXT,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_unidades_grupo
  ON unidades_programacion(grupo_clase_id, fecha_inicio, id);

CREATE TABLE IF NOT EXISTS unidad_programacion_ra (
  unidad_id  INTEGER NOT NULL REFERENCES unidades_programacion(id) ON DELETE CASCADE,
  ra_codigo  TEXT NOT NULL,
  PRIMARY KEY (unidad_id, ra_codigo)
);

ALTER TABLE programacion_aula ADD COLUMN unidad_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_programacion_unidad
  ON programacion_aula(unidad_id, fecha, id);

CREATE TABLE IF NOT EXISTS calendario_escolar (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  curso_academico_id   INTEGER NOT NULL REFERENCES cursos_academicos(id) ON DELETE CASCADE,
  fecha                TEXT NOT NULL,
  tipo                 TEXT NOT NULL CHECK (tipo IN ('lectivo', 'no_lectivo', 'festivo', 'vacaciones')),
  descripcion          TEXT,
  creado_en            TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (curso_academico_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_calendario_curso
  ON calendario_escolar(curso_academico_id, fecha);

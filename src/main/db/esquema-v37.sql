-- Migración v37: convocatorias ordinaria y extraordinaria.
CREATE TABLE IF NOT EXISTS convocatorias (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  grupo_clase_id  INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('ordinaria', 'extraordinaria')),
  nombre          TEXT NOT NULL,
  fecha           TEXT,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_convocatorias_grupo
  ON convocatorias(grupo_clase_id, fecha, id);

CREATE TABLE IF NOT EXISTS convocatoria_bloques (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  convocatoria_id INTEGER NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  descripcion    TEXT NOT NULL DEFAULT '',
  avaluacion_id  TEXT,
  unidad_id      INTEGER REFERENCES unidades_programacion(id) ON DELETE SET NULL,
  ra_codigo      TEXT,
  ce_codigo      TEXT,
  peso           REAL NOT NULL DEFAULT 0,
  orden          INTEGER NOT NULL DEFAULT 0,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_convocatoria_bloques
  ON convocatoria_bloques(convocatoria_id, orden, id);

CREATE TABLE IF NOT EXISTS convocatoria_asignaciones (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  convocatoria_id INTEGER NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
  alumno_id       INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  bloque_id       INTEGER NOT NULL REFERENCES convocatoria_bloques(id) ON DELETE CASCADE,
  nota            REAL,
  observaciones   TEXT,
  incluida        INTEGER NOT NULL DEFAULT 1,
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (convocatoria_id, alumno_id, bloque_id)
);

CREATE INDEX IF NOT EXISTS idx_convocatoria_asignaciones
  ON convocatoria_asignaciones(convocatoria_id, alumno_id);

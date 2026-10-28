-- Esquema de la base de datos local (SQLite).
--
-- Genérico y multi-ciclo: ciclos → módulos → RA → CE, más la gestión
-- (alumnos, entregas, notas) y la configuración.

PRAGMA foreign_keys = ON;

-- --- Datos del BOE ----------------------------------------------------

CREATE TABLE IF NOT EXISTS ciclos (
  id                     TEXT PRIMARY KEY,
  denominacion           TEXT NOT NULL,
  nivel                  TEXT,
  familia_profesional    TEXT,
  duracion_horas         INTEGER,
  ects                   INTEGER,
  rd                     TEXT,
  rd_actualizacion       TEXT,
  boe_url                TEXT,
  boe_url_actualizacion  TEXT
);

CREATE TABLE IF NOT EXISTS modulos (
  codigo              TEXT PRIMARY KEY,
  ciclo_id            TEXT NOT NULL REFERENCES ciclos(id) ON DELETE CASCADE,
  nombre              TEXT NOT NULL,
  ects                INTEGER,
  horas_minimas_boe   INTEGER
);

CREATE TABLE IF NOT EXISTS resultados_aprendizaje (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  modulo_codigo   TEXT NOT NULL REFERENCES modulos(codigo) ON DELETE CASCADE,
  codigo          TEXT NOT NULL,
  numero          INTEGER NOT NULL,
  descripcion     TEXT NOT NULL,
  peso            REAL NOT NULL DEFAULT 0,
  UNIQUE (modulo_codigo, codigo)
);

CREATE TABLE IF NOT EXISTS criterios_evaluacion (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ra_id        INTEGER NOT NULL REFERENCES resultados_aprendizaje(id) ON DELETE CASCADE,
  codigo       TEXT NOT NULL,
  descripcion  TEXT NOT NULL,
  peso         REAL NOT NULL DEFAULT 0,
  UNIQUE (ra_id, codigo)
);

-- --- Gestión ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS grupos (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS alumnos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  apellidos   TEXT NOT NULL,
  dni         TEXT,
  email       TEXT,
  grupo_id    INTEGER REFERENCES grupos(id) ON DELETE SET NULL,
  activo      INTEGER NOT NULL DEFAULT 1,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS entregas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  modulo_codigo   TEXT NOT NULL REFERENCES modulos(codigo) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  origen          TEXT,
  tipo            TEXT NOT NULL DEFAULT 'tarea',
  fecha_limite    TEXT,
  peso            REAL NOT NULL DEFAULT 0,
  creada_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Relación N:M entre entregas y criterios de evaluación, con su peso.
CREATE TABLE IF NOT EXISTS entrega_ce (
  entrega_id  INTEGER NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  ce_id       INTEGER NOT NULL REFERENCES criterios_evaluacion(id) ON DELETE CASCADE,
  peso        REAL NOT NULL DEFAULT 1,
  PRIMARY KEY (entrega_id, ce_id)
);

CREATE TABLE IF NOT EXISTS entregas_alumno (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entrega_id      INTEGER NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  alumno_id       INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  fecha_entrega   TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente',
  ruta_fichero    TEXT,
  observaciones   TEXT,
  UNIQUE (entrega_id, alumno_id)
);

CREATE TABLE IF NOT EXISTS notas (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  entrega_alumno_id    INTEGER NOT NULL REFERENCES entregas_alumno(id) ON DELETE CASCADE,
  ce_id                INTEGER NOT NULL REFERENCES criterios_evaluacion(id) ON DELETE CASCADE,
  nota                 REAL NOT NULL,
  comentario           TEXT,
  UNIQUE (entrega_alumno_id, ce_id)
);

CREATE TABLE IF NOT EXISTS config (
  clave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL
);

-- --- Índices ----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_modulos_ciclo     ON modulos(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_ra_modulo         ON resultados_aprendizaje(modulo_codigo);
CREATE INDEX IF NOT EXISTS idx_ce_ra             ON criterios_evaluacion(ra_id);
CREATE INDEX IF NOT EXISTS idx_entregas_modulo   ON entregas(modulo_codigo);
CREATE INDEX IF NOT EXISTS idx_ea_entrega        ON entregas_alumno(entrega_id);
CREATE INDEX IF NOT EXISTS idx_ea_alumno         ON entregas_alumno(alumno_id);

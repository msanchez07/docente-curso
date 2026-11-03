-- Migración v40: cursos de especialización en el catálogo.
--
-- El catálogo se reconstruye en cada arranque, así que se puede recrear la
-- tabla para ampliar el CHECK de nivel sin migrar filas.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS catalogo_modulos;
DROP TABLE IF EXISTS catalogo_ciclos;

CREATE TABLE catalogo_ciclos (
  id                  TEXT PRIMARY KEY,
  denominacion        TEXT NOT NULL,
  nivel               TEXT NOT NULL CHECK (nivel IN ('GB', 'GM', 'GS', 'CE')),
  familia_profesional TEXT NOT NULL,
  abreviatura         TEXT NOT NULL,
  curso_academico     TEXT NOT NULL
);

CREATE TABLE catalogo_modulos (
  ciclo_id         TEXT NOT NULL REFERENCES catalogo_ciclos(id) ON DELETE CASCADE,
  curso            TEXT NOT NULL CHECK (curso IN ('1', '2')),
  codigo           TEXT NOT NULL,
  nombre           TEXT NOT NULL,
  horas_semanales  INTEGER,
  horas_anuales    INTEGER,
  PRIMARY KEY (ciclo_id, curso, codigo)
);

CREATE INDEX IF NOT EXISTS idx_catalogo_modulos_ciclo
  ON catalogo_modulos(ciclo_id, curso, codigo);
CREATE INDEX IF NOT EXISTS idx_catalogo_ciclos_nivel
  ON catalogo_ciclos(nivel, denominacion);

PRAGMA foreign_keys = ON;

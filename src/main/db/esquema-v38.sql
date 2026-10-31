-- Migración v38: catálogo de secuenciación y horarios oficiales.
--
-- El catálogo se carga desde los PDFs de la Conselleria y sirve para crear
-- grupos de cualquier ciclo. La tabla `ciclos` sigue reservada a los ciclos con
-- datos BOE (RA/CE); los ciclos del catálogo se materializan en `ciclos` y
-- `modulos` solo cuando se crea un grupo que los necesita.

ALTER TABLE ciclos ADD COLUMN abreviatura TEXT;
ALTER TABLE ciclos ADD COLUMN origen TEXT NOT NULL DEFAULT 'boe';

CREATE TABLE IF NOT EXISTS catalogo_ciclos (
  id                  TEXT PRIMARY KEY,
  denominacion        TEXT NOT NULL,
  nivel               TEXT NOT NULL CHECK (nivel IN ('GB', 'GM', 'GS')),
  familia_profesional TEXT NOT NULL,
  abreviatura         TEXT NOT NULL,
  curso_academico     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalogo_modulos (
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

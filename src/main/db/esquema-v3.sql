-- Migración v3: matrículas.
--
-- Un alumno cursa uno o varios módulos (y un módulo tiene muchos alumnos), así
-- que la relación es N:M. El alumnado deja de ser una lista global: cada módulo
-- muestra solo quien está matriculado en él.

CREATE TABLE IF NOT EXISTS matriculas (
  alumno_id      INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  modulo_codigo  TEXT    NOT NULL REFERENCES modulos(codigo) ON DELETE CASCADE,
  PRIMARY KEY (alumno_id, modulo_codigo)
);

CREATE INDEX IF NOT EXISTS idx_matriculas_modulo ON matriculas(modulo_codigo);

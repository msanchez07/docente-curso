-- Migración v6: grupos.
--
-- Un mismo módulo se puede impartir en varias modalidades (presencial y
-- semipresencial), cada una con su propio alumnado y su propio modelo de
-- evaluación. Ese es el «grupo»: módulo + nombre + modalidad.
--
-- Las matrículas pasan de colgar del módulo a colgar del grupo.

CREATE TABLE IF NOT EXISTS grupos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  modulo_codigo  TEXT NOT NULL REFERENCES modulos(codigo) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  modalidad      TEXT NOT NULL DEFAULT 'presencial',
  UNIQUE (modulo_codigo, nombre)
);

CREATE INDEX IF NOT EXISTS idx_grupos_modulo ON grupos(modulo_codigo);

-- Se conserva el alumnado ya matriculado: un grupo por cada módulo que tenga
-- matrículas, para no perder nada.
INSERT INTO grupos (modulo_codigo, nombre, modalidad)
  SELECT DISTINCT m.modulo_codigo, 'Grupo único', 'presencial'
    FROM matriculas m
   WHERE NOT EXISTS (SELECT 1 FROM grupos g WHERE g.modulo_codigo = m.modulo_codigo);

CREATE TABLE matriculas_nuevo (
  alumno_id  INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  grupo_id   INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  PRIMARY KEY (alumno_id, grupo_id)
);

INSERT INTO matriculas_nuevo (alumno_id, grupo_id)
  SELECT m.alumno_id, g.id
    FROM matriculas m
    JOIN grupos g ON g.modulo_codigo = m.modulo_codigo;

DROP TABLE matriculas;
ALTER TABLE matriculas_nuevo RENAME TO matriculas;

CREATE INDEX IF NOT EXISTS idx_matriculas_grupo ON matriculas(grupo_id);

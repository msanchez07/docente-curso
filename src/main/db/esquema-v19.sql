-- Migración v19: cursos académicos y grupos dentro de cada curso.
--
-- El «curso» de un grupo (1º/2º del módulo) no es el curso académico. A partir
-- de aquí todo grupo cuelga de un curso académico (26/26, 25/26…). Los grupos
-- existentes se asignan al curso actual, que se crea con el nombre 26/26.
--
-- La tabla grupos_clase se reconstruye para que la unicidad incluya el curso
-- académico: el mismo módulo y modalidad puede repetirse en cursos distintos.

CREATE TABLE IF NOT EXISTS cursos_academicos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL UNIQUE,
  inicio     INTEGER NOT NULL,
  fin        INTEGER NOT NULL,
  actual     INTEGER NOT NULL DEFAULT 0 CHECK (actual IN (0, 1)),
  creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cursos_academicos_actual
  ON cursos_academicos(actual) WHERE actual = 1;

-- Curso actual derivado de la fecha: septiembre anterior a hoy y julio siguiente.
WITH periodo AS (
  SELECT CASE
           WHEN CAST(strftime('%m', 'now') AS INTEGER) >= 9
             THEN CAST(strftime('%Y', 'now') AS INTEGER)
           ELSE CAST(strftime('%Y', 'now') AS INTEGER) - 1
         END AS inicio
)
INSERT INTO cursos_academicos (nombre, inicio, fin, actual)
SELECT inicio || '/' || (inicio + 1), inicio, inicio + 1, 1
  FROM periodo
 WHERE NOT EXISTS (SELECT 1 FROM cursos_academicos);

WITH periodo AS (
  SELECT CASE
           WHEN CAST(strftime('%m', 'now') AS INTEGER) >= 9
             THEN CAST(strftime('%Y', 'now') AS INTEGER)
           ELSE CAST(strftime('%Y', 'now') AS INTEGER) - 1
         END AS inicio
)
UPDATE cursos_academicos
   SET actual = 1
 WHERE id = (
         SELECT id FROM cursos_academicos
          WHERE inicio = (SELECT inicio FROM periodo)
            AND fin = (SELECT inicio + 1 FROM periodo)
          LIMIT 1
       )
   AND NOT EXISTS (SELECT 1 FROM cursos_academicos WHERE actual = 1);

PRAGMA foreign_keys = OFF;
PRAGMA legacy_alter_table = ON;

BEGIN;

ALTER TABLE grupos_clase RENAME TO grupos_clase_old;

CREATE TABLE grupos_clase (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  curso_academico_id  INTEGER NOT NULL REFERENCES cursos_academicos(id) ON DELETE RESTRICT,
  ciclo_id            TEXT NOT NULL REFERENCES ciclos(id) ON DELETE CASCADE,
  curso               TEXT NOT NULL CHECK (curso IN ('1', '2')),
  modalidad           TEXT NOT NULL CHECK (modalidad IN ('presencial', 'semipresencial')),
  modulo_codigo       TEXT NOT NULL REFERENCES modulos(codigo) ON DELETE CASCADE,
  nombre              TEXT NOT NULL,
  creado_en           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (curso_academico_id, ciclo_id, curso, modalidad, modulo_codigo)
);

INSERT INTO grupos_clase
  (id, curso_academico_id, ciclo_id, curso, modalidad, modulo_codigo, nombre, creado_en)
SELECT old.id,
       COALESCE(
         (SELECT id FROM cursos_academicos WHERE actual = 1 ORDER BY id LIMIT 1),
         (SELECT id FROM cursos_academicos ORDER BY id LIMIT 1)
       ),
       old.ciclo_id,
       old.curso,
       old.modalidad,
       old.modulo_codigo,
       old.nombre,
       old.creado_en
  FROM grupos_clase_old old;

DROP TABLE grupos_clase_old;

CREATE INDEX IF NOT EXISTS idx_grupos_clase_ciclo ON grupos_clase(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_grupos_clase_modulo ON grupos_clase(modulo_codigo);
CREATE INDEX IF NOT EXISTS idx_grupos_clase_curso_academico
  ON grupos_clase(curso_academico_id);

COMMIT;

PRAGMA legacy_alter_table = OFF;
PRAGMA foreign_keys = ON;

-- Migración v30: informes de faltas a nivel de curso e historial.
--
-- La tutoría trabaja con todos los módulos de un curso (ciclo + nivel +
-- modalidad). Cada PDF subido se guarda como un informe histórico; el JSON
-- contiene los totales por alumno y módulo.

CREATE TABLE IF NOT EXISTS faltas_modulo_config (
  grupo_clase_id INTEGER PRIMARY KEY REFERENCES grupos_clase(id) ON DELETE CASCADE,
  nombre_informe TEXT NOT NULL DEFAULT '',
  horas          REAL NOT NULL DEFAULT 0,
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faltas_informes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  curso_academico_id  INTEGER NOT NULL REFERENCES cursos_academicos(id) ON DELETE CASCADE,
  ciclo_id            TEXT NOT NULL,
  curso               TEXT NOT NULL CHECK (curso IN ('1', '2')),
  modalidad           TEXT NOT NULL CHECK (modalidad IN ('presencial', 'semipresencial')),
  archivo             TEXT NOT NULL,
  subido_en           TEXT NOT NULL DEFAULT (datetime('now')),
  datos               TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faltas_informes_curso
  ON faltas_informes(curso_academico_id, ciclo_id, curso, modalidad, subido_en);

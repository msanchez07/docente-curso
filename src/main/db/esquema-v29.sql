-- Migración v29: control de faltas por grupo y alumno.
--
-- Se guardan los totales de faltas y faltas justificadas de cada alumno en el
-- grupo. Los ajustes del cálculo (horas, límite y códigos del informe) viven
-- en config.

CREATE TABLE IF NOT EXISTS faltas_alumno (
  grupo_clase_id INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  alumno_id      INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  faltas         REAL NOT NULL DEFAULT 0 CHECK (faltas >= 0),
  justificadas   REAL NOT NULL DEFAULT 0 CHECK (justificadas >= 0),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (grupo_clase_id, alumno_id)
);

CREATE INDEX IF NOT EXISTS idx_faltas_grupo ON faltas_alumno(grupo_clase_id);

-- Migración v43: RA que el alumno trabaja en la formación en empresa.

CREATE TABLE IF NOT EXISTS formacion_empresa_ra (
  grupo_clase_id INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  alumno_id      INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  ra_codigo      TEXT NOT NULL,
  tipo           TEXT NOT NULL CHECK (tipo IN ('total', 'parcial')),
  PRIMARY KEY (grupo_clase_id, alumno_id, ra_codigo)
);

CREATE INDEX IF NOT EXISTS idx_formacion_empresa_ra_alumno
  ON formacion_empresa_ra(grupo_clase_id, alumno_id);

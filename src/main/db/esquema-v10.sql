-- Migración v10: matrículas en los grupos de clase.
--
-- Relación N:M entre alumnado y grupos de clase. La sección de Alumnado
-- todavía no existe, pero la tabla permite contar el alumnado de cada grupo
-- desde ahora y evita cambiar el modelo cuando se implemente.

CREATE TABLE IF NOT EXISTS matriculas_clase (
  alumno_id      INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  grupo_clase_id INTEGER NOT NULL REFERENCES grupos_clase(id) ON DELETE CASCADE,
  PRIMARY KEY (alumno_id, grupo_clase_id)
);

CREATE INDEX IF NOT EXISTS idx_matriculas_clase_grupo ON matriculas_clase(grupo_clase_id);

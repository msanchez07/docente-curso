-- Migración v31: criterios de evaluación concretos por unidad.
--
-- Hasta ahora una unidad solo podía referenciar RA completos. Una unidad real
-- puede trabajar solo algunos CE de un RA, todos o criterios de varios RA.
-- La tabla nueva guarda la selección exacta; la tabla de RA se conserva para
-- compatibilidad y se rellena a partir de estos criterios.

CREATE TABLE IF NOT EXISTS unidad_programacion_ce (
  unidad_id  INTEGER NOT NULL REFERENCES unidades_programacion(id) ON DELETE CASCADE,
  ra_codigo  TEXT NOT NULL,
  ce_codigo  TEXT NOT NULL,
  PRIMARY KEY (unidad_id, ra_codigo, ce_codigo)
);

CREATE INDEX IF NOT EXISTS idx_unidad_programacion_ce
  ON unidad_programacion_ce(ce_codigo);

-- Las unidades antiguas que solo indicaban RA pasan a tener todos sus CE.
INSERT OR IGNORE INTO unidad_programacion_ce (unidad_id, ra_codigo, ce_codigo)
SELECT upr.unidad_id, upr.ra_codigo, ce.codigo
  FROM unidad_programacion_ra upr
  JOIN unidades_programacion up ON up.id = upr.unidad_id
  JOIN grupos_clase gc ON gc.id = up.grupo_clase_id
  JOIN resultados_aprendizaje ra
    ON ra.modulo_codigo = gc.modulo_codigo
   AND ra.codigo = upr.ra_codigo
  JOIN criterios_evaluacion ce ON ce.ra_id = ra.id;

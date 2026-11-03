-- Migración v42: pérdida de evaluación continua por matrícula.
--
-- La marca es por alumno y grupo/módulo: un alumno puede perder la evaluación
-- continua en un módulo y no en otro.

ALTER TABLE matriculas_clase
  ADD COLUMN perdida_evaluacion_continua INTEGER NOT NULL DEFAULT 0;

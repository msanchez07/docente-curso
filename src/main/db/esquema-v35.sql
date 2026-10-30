-- Migración v35: trimestre/evaluación al que pertenece cada unidad.
ALTER TABLE unidades_programacion ADD COLUMN avaluacion_id TEXT;

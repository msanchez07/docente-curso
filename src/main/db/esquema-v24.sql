-- Migración v24: horas realizadas en los periodos de formación en empresa.

ALTER TABLE formacion_empresa ADD COLUMN horas REAL NOT NULL DEFAULT 0;

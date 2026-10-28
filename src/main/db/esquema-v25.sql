-- Migración v25: varias sesiones por día, con hora y orden.

ALTER TABLE programacion_aula ADD COLUMN hora TEXT;
ALTER TABLE programacion_aula ADD COLUMN orden INTEGER NOT NULL DEFAULT 0;

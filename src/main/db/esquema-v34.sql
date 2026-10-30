-- Migración v34: mínimos de la plantilla de calificación por unidad.
ALTER TABLE unidades_programacion
  ADD COLUMN requisitos_json TEXT NOT NULL DEFAULT '[]';

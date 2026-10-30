-- Migración v33: plantilla de calificación propia por unidad.
--
-- Cada unidad puede importar una plantilla con sus categorías e instrumentos
-- de evaluación. Se guarda como JSON para mantener el formato flexible.

ALTER TABLE unidades_programacion
  ADD COLUMN categorias_json TEXT NOT NULL DEFAULT '[]';

-- Migración v36: contenido estructurado de la ficha de una entrega.
ALTER TABLE entregas_clase ADD COLUMN enunciado TEXT NOT NULL DEFAULT '';
ALTER TABLE entregas_clase ADD COLUMN problema TEXT NOT NULL DEFAULT '';
ALTER TABLE entregas_clase ADD COLUMN restricciones TEXT NOT NULL DEFAULT '';

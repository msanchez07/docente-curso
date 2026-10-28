-- Migración v4: cada entrega se sitúa en una avaluación (AV1, AV2, AV3) y en
-- una categoría del modelo de evaluación (exámenes, actividades, proyectos…).

ALTER TABLE entregas ADD COLUMN avaluacion TEXT;
ALTER TABLE entregas ADD COLUMN categoria TEXT;

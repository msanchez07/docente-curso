-- Migración v5: nota directa de una entrega.
--
-- El profesorado suele calificar una entrega con una sola nota (el examen vale
-- 7), sin desglosarla criterio a criterio. La nota por CE sigue disponible para
-- la trazabilidad con el BOE, pero esta manda si está puesta.

ALTER TABLE entregas_alumno ADD COLUMN nota REAL;

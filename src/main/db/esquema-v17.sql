-- Migración v17: bloqueo de entregas ya calificadas.
--
-- Una entrega bloqueada no se puede editar, borrar ni volver a calificar.
-- El bloqueo se puede quitar explícitamente desde la lista de entregas.

ALTER TABLE entregas_clase ADD COLUMN bloqueada INTEGER NOT NULL DEFAULT 0;

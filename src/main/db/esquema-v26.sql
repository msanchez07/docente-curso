-- Migración v26: horario semanal del grupo.
--
-- Se guarda una sola vez, en el grupo: cuántas sesiones hay cada día de la
-- semana. La programación de aula lo usa para generar las sesiones sin tener
-- que repetir el horario cada vez.

ALTER TABLE grupos_clase ADD COLUMN dias_semana TEXT NOT NULL DEFAULT '{}';

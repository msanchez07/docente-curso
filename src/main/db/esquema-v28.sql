-- Migración v28: calendario semanal por bloques de 55 minutos.
--
-- Cada día guarda las horas de inicio de los bloques seleccionados. Se usa en
-- el formulario del grupo y en la documentación de la programación.

ALTER TABLE grupos_clase ADD COLUMN bloques_semana TEXT NOT NULL DEFAULT '{}';

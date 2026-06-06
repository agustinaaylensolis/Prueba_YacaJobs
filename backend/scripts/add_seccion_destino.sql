-- Migración para añadir soporte de secciones a las notificaciones
-- Esto permitirá prender badges azules/rojos en las pestañas correctas de los usuarios

ALTER TABLE notificaciones 
ADD COLUMN seccion_destino VARCHAR(50) DEFAULT 'GENERAL';

-- Opcionalmente, podemos intentar inferir las notificaciones viejas, pero por defecto se asume GENERAL.
-- Por ejemplo, las notificaciones de nuevos trabajos al Foro:
UPDATE notificaciones
SET seccion_destino = 'FORO'
WHERE titulo = 'Nuevo trabajo en tu rubro';

-- Deshabilitar Row Level Security (RLS) para que el cliente Anon del Frontend pueda
-- consultar y actualizar el estado de lectura de sus notificaciones.
ALTER TABLE public.notificaciones DISABLE ROW LEVEL SECURITY;

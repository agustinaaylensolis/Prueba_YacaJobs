-- Habilitar Supabase Realtime para las tablas de mensajería y contratos
-- Ejecutar en el SQL Editor de Supabase

BEGIN;

-- Verificar si la publicación existe, si no crearla (normalmente ya existe en Supabase)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication 
    WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Agregar tablas a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contrataciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversaciones;

COMMIT;

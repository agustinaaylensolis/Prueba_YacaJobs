-- Script de migración: Creación de buckets y modificación de tabla trabajadores
-- Este script asume que la extensión storage ya está configurada en el proyecto de Supabase.

BEGIN;

-- 1. Agregar columna certificados JSONB a trabajadores
ALTER TABLE public.trabajadores ADD COLUMN IF NOT EXISTS certificados JSONB DEFAULT '[]'::jsonb;

COMMIT;

-- Nota: Las operaciones de Storage no siempre pueden ser hechas en una transacción transaccional
-- si se está usando una API de administración, pero en Supabase local/SQL a veces se requiere 
-- insertar en storage.buckets.
-- Si el siguiente bloque falla por permisos, deberás crear los buckets manualmente
-- desde el Dashboard de Supabase en Storage -> New Bucket.

INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('dnis', 'dnis', true),
  ('certificados', 'certificados', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para acceso público de lectura y subida (simplificado)
-- Dependiendo del entorno, puede requerirse ser más estricto.

-- Avatars
CREATE POLICY "Public Access avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Upload Access avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Update Access avatars" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Delete Access avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');

-- DNIs
CREATE POLICY "Public Access dnis" ON storage.objects FOR SELECT USING (bucket_id = 'dnis');
CREATE POLICY "Upload Access dnis" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dnis');
CREATE POLICY "Update Access dnis" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'dnis');
CREATE POLICY "Delete Access dnis" ON storage.objects FOR DELETE USING (bucket_id = 'dnis');

-- Certificados
CREATE POLICY "Public Access certificados" ON storage.objects FOR SELECT USING (bucket_id = 'certificados');
CREATE POLICY "Upload Access certificados" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificados');
CREATE POLICY "Update Access certificados" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'certificados');
CREATE POLICY "Delete Access certificados" ON storage.objects FOR DELETE USING (bucket_id = 'certificados');

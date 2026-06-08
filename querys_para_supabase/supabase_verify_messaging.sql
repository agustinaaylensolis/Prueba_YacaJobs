-- Verificacion rapida de tablas de mensajeria en Supabase
-- Ejecuta este archivo en el SQL Editor del proyecto correcto.

-- 1) Comprobar si las tablas existen en el esquema public
select
  schemaname,
  tablename
from pg_tables
where schemaname = 'public'
  and tablename in ('conversaciones', 'mensajes', 'contrataciones')
order by tablename;

-- 2) Ver columnas esperadas por tabla
select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('conversaciones', 'mensajes', 'contrataciones')
order by table_name, ordinal_position;

-- 3) Ver si RLS esta habilitado en esas tablas
select
  relname as table_name,
  relrowsecurity as rls_enabled
from pg_class
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and relname in ('conversaciones', 'mensajes', 'contrataciones')
order by relname;

-- 4) Ver politicas existentes sobre esas tablas
select
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('conversaciones', 'mensajes', 'contrataciones')
order by tablename, policyname;

-- 5) Si no aparecen en el paso 1, ejecuta el bloque de creacion desde supabase_setup.sql.
-- El archivo supabase_setup.sql ya contiene CREATE TABLE IF NOT EXISTS para las 3 tablas.
-- Tambien conviene verificar que estas mirando el mismo proyecto cuyas credenciales usa la app.

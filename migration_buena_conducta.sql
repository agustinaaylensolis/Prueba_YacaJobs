-- 1. Alterar la columna certificado_trabajador para que sea de tipo TEXT
ALTER TABLE public.trabajadores ALTER COLUMN certificado_trabajador TYPE TEXT USING NULL;

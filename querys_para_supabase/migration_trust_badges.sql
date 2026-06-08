-- Migración para fechas de actualización de documentos (Trust Badges)

-- 1. Tabla: clientes
ALTER TABLE "public"."clientes"
ADD COLUMN IF NOT EXISTS "fecha_actualizacion_foto" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "fecha_actualizacion_dni" TIMESTAMP WITH TIME ZONE;

-- 2. Tabla: trabajadores
ALTER TABLE "public"."trabajadores"
ADD COLUMN IF NOT EXISTS "fecha_actualizacion_foto" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "fecha_actualizacion_dni" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "fecha_actualizacion_antecedentes" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "fecha_actualizacion_certificados" TIMESTAMP WITH TIME ZONE;

-- (Opcional) Inicializar con la fecha de registro si las URLs ya existen
UPDATE "public"."clientes" 
SET fecha_actualizacion_foto = fecha_registro 
WHERE url_foto_perfil IS NOT NULL AND fecha_actualizacion_foto IS NULL;

UPDATE "public"."clientes" 
SET fecha_actualizacion_dni = fecha_registro 
WHERE url_dni_frente IS NOT NULL AND fecha_actualizacion_dni IS NULL;

UPDATE "public"."trabajadores" 
SET fecha_actualizacion_foto = fecha_registro 
WHERE url_foto_perfil IS NOT NULL AND fecha_actualizacion_foto IS NULL;

UPDATE "public"."trabajadores" 
SET fecha_actualizacion_dni = fecha_registro 
WHERE url_dni_frente_trabajador IS NOT NULL AND fecha_actualizacion_dni IS NULL;

UPDATE "public"."trabajadores" 
SET fecha_actualizacion_antecedentes = fecha_registro 
WHERE certificado_trabajador IS NOT NULL AND fecha_actualizacion_antecedentes IS NULL;

-- Para certificados asumiendo que ya hay JSON
UPDATE "public"."trabajadores" 
SET fecha_actualizacion_certificados = fecha_registro 
WHERE jsonb_array_length(certificados) > 0 AND fecha_actualizacion_certificados IS NULL;

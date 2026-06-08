-- SQL script to set up Admin role and tables for YacaJobs
-- Execute this in the Supabase SQL Editor

-- 1. Create administradores table
CREATE TABLE IF NOT EXISTS public.administradores (
    id_admin serial PRIMARY KEY,
    correo character varying NOT NULL UNIQUE,
    contraseña character varying NOT NULL,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insert initial administrator (yacajobs2026@gmail.com / 12345678)
-- Password hashed using bcryptjs with 10 salt rounds
INSERT INTO public.administradores (correo, contraseña)
VALUES ('yacajobs2026@gmail.com', '$2b$10$lOHYfavMLtpClhzwbRI5i.jZcnHaZtbGVkRRxy7iNnEfxAkmREVEq')
ON CONFLICT (correo) DO NOTHING;

-- 3. Add suspendido column to clientes table
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS suspendido boolean DEFAULT false;

-- 4. Add suspendido column to trabajadores table
ALTER TABLE public.trabajadores
ADD COLUMN IF NOT EXISTS suspendido boolean DEFAULT false;

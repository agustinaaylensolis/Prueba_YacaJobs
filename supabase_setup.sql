-- Script SQL para YacaJobs - MVP Académico
-- Compatible con PostgreSQL (Supabase)
-- Basado en el Diccionario de Datos del Documento de Referencia

-- Extensión para IDs si se desea usar UUIDs (opcional, aquí usaré SERIAL por simplicidad académica)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Oficios
CREATE TABLE IF NOT EXISTS oficios (
    id_oficio SERIAL PRIMARY KEY,
    nombre_oficio VARCHAR(100) UNIQUE NOT NULL,
    especialidad_oficio VARCHAR(100)
);

-- 2. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente SERIAL PRIMARY KEY,
    contraseña_cliente VARCHAR(100) NOT NULL,
    nombre_y_apellido_cliente VARCHAR(100) NOT NULL,
    dni_cliente INT UNIQUE NOT NULL,
    correo_cliente VARCHAR(100) UNIQUE NOT NULL,
    celular_cliente VARCHAR(20) NOT NULL,
    url_foto_perfil TEXT,
    url_dni_frente TEXT,
    url_dni_dorso TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Trabajadores
CREATE TABLE IF NOT EXISTS trabajadores (
    id_trabajador SERIAL PRIMARY KEY,
    contraseña_trabajador VARCHAR(100) NOT NULL,
    nombre_y_apellido_trabajador VARCHAR(100) NOT NULL,
    dni_trabajador INT UNIQUE NOT NULL,
    correo_trabajador VARCHAR(100) UNIQUE NOT NULL,
    nro_celular_trabajador VARCHAR(20) NOT NULL,
    constancia_policial BOOLEAN DEFAULT FALSE,
    monotributo_trabajador TEXT, -- URL a imagen/PDF
    matricula_trabajador VARCHAR(100),
    certificado_trabajador TEXT, -- URL a imagen/PDF
    url_foto_perfil TEXT,
    url_dni_frente_trabajador TEXT,
    url_dni_reverso_trabajador TEXT,
    puntuacion DECIMAL(3,2) DEFAULT 0.00,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Asociación Trabajador-Oficio (N a N)
CREATE TABLE IF NOT EXISTS oficio_del_trabajador (
    id_oficio INT REFERENCES oficios(id_oficio) ON DELETE CASCADE,
    id_trabajador INT REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    PRIMARY KEY (id_oficio, id_trabajador)
);

-- 5. Tabla de Publicaciones (Foro de Presupuestos)
CREATE TABLE IF NOT EXISTS publicaciones (
    id_publi SERIAL PRIMARY KEY,
    fecha_publi TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tipo_urgencia VARCHAR(50) NOT NULL, -- 'Alta', 'Media', 'Baja'
    descripcion_publi TEXT NOT NULL,
    monotributo_publi BOOLEAN DEFAULT FALSE, -- Si requiere que el trabajador tenga monotributo
    matricula_publi BOOLEAN DEFAULT FALSE,   -- Si requiere matrícula
    certificado_publi BOOLEAN DEFAULT FALSE, -- Si requiere certificado
    id_cliente INT REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    id_oficio INT REFERENCES oficios(id_oficio) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'Abierta' -- 'Abierta', 'Cerrada', 'En Proceso'
);

-- 6. Tabla de Postulaciones (Presupuestos del Trabajador)
CREATE TABLE IF NOT EXISTS postulaciones (
    id_postulacion SERIAL PRIMARY KEY,
    id_trabajador INT REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    id_publi INT REFERENCES publicaciones(id_publi) ON DELETE CASCADE,
    presupuesto DECIMAL(10,2) NOT NULL,
    materiales TEXT, -- Descripción de materiales necesarios
    descripcion_postulacion TEXT,
    fecha_postulacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Reseñas/Calificaciones (Opcional pero recomendado para el Scoring)
CREATE TABLE IF NOT EXISTS valoraciones (
    id_valoracion SERIAL PRIMARY KEY,
    puntuacion INT CHECK (puntuacion >= 1 AND puntuacion <= 5),
    comentario TEXT,
    id_emisor_cliente INT REFERENCES clientes(id_cliente),
    id_receptor_trabajador INT REFERENCES trabajadores(id_trabajador),
    fecha_valoracion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Datos Iniciales de Oficios
INSERT INTO oficios (nombre_oficio, especialidad_oficio) VALUES
('Carpintero', 'Muebles y aberturas'),
('Electricista', 'Instalaciones domiciliarias'),
('Albañil', 'Construcción en seco y húmedo'),
('Plomero', 'Instalación de agua y gas'),
('Sastre', 'Confección y arreglos'),
('Mecánico', 'Automotores y motos');

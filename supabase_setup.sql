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
    edad_cliente INT NOT NULL,
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
    edad_trabajador INT NOT NULL,
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

-- Compatibilidad para bases ya creadas sin edad
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS edad_cliente INT;
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS edad_trabajador INT;

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
    estado_publi VARCHAR(20) DEFAULT 'Abierta' -- 'Abierta', 'Cerrada', 'En Proceso'
);

-- 6. Tabla de Postulaciones (Presupuestos del Trabajador)
CREATE TABLE IF NOT EXISTS postulaciones (
    id_postulacion SERIAL PRIMARY KEY,
    id_trabajador INT REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    id_publi INT REFERENCES publicaciones(id_publi) ON DELETE CASCADE,
    presupuesto DECIMAL(12,2) NOT NULL,
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

-- 8. Tabla de Conversaciones Cliente-Trabajador
CREATE TABLE IF NOT EXISTS conversaciones (
    id_conversacion SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    id_trabajador INT NOT NULL REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    id_publi INT REFERENCES publicaciones(id_publi) ON DELETE SET NULL,
    id_postulacion INT REFERENCES postulaciones(id_postulacion) ON DELETE SET NULL,
    estado_conversacion VARCHAR(20) NOT NULL DEFAULT 'Activa',
    ultimo_mensaje_preview TEXT,
    ultima_actividad TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_cliente, id_trabajador, id_publi)
);

CREATE INDEX IF NOT EXISTS idx_conversaciones_cliente ON conversaciones (id_cliente);
CREATE INDEX IF NOT EXISTS idx_conversaciones_trabajador ON conversaciones (id_trabajador);
CREATE INDEX IF NOT EXISTS idx_conversaciones_ultima_actividad ON conversaciones (ultima_actividad DESC);

-- 9. Tabla de Mensajes Internos
CREATE TABLE IF NOT EXISTS mensajes (
    id_mensaje SERIAL PRIMARY KEY,
    id_conversacion INT NOT NULL REFERENCES conversaciones(id_conversacion) ON DELETE CASCADE,
    id_emisor_cliente INT REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    id_emisor_trabajador INT REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    contenido_mensaje TEXT NOT NULL,
    leido_por_cliente_at TIMESTAMP WITH TIME ZONE,
    leido_por_trabajador_at TIMESTAMP WITH TIME ZONE,
    fecha_mensaje TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_emisor_unico CHECK (
        (id_emisor_cliente IS NOT NULL AND id_emisor_trabajador IS NULL)
        OR (id_emisor_cliente IS NULL AND id_emisor_trabajador IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_fecha ON mensajes (id_conversacion, fecha_mensaje DESC);

-- 10. Tabla de Contrataciones
CREATE TABLE IF NOT EXISTS contrataciones (
    id_contratacion SERIAL PRIMARY KEY,
    id_conversacion INT NOT NULL UNIQUE REFERENCES conversaciones(id_conversacion) ON DELETE CASCADE,
    id_cliente INT NOT NULL REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    id_trabajador INT NOT NULL REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    estado_contratacion VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    monto_acordado NUMERIC(12,2),
    precio_final_acordado NUMERIC(12,2),
    fecha_horario_acordado TIMESTAMP WITH TIME ZONE,
    materiales_incluidos BOOLEAN,
    direccion_o_zona TEXT,
    condiciones_especiales TEXT,
    detalle_acuerdo TEXT,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_confirmacion TIMESTAMP WITH TIME ZONE,
    fecha_rechazo TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_contrataciones_cliente ON contrataciones (id_cliente);
CREATE INDEX IF NOT EXISTS idx_contrataciones_trabajador ON contrataciones (id_trabajador);
CREATE INDEX IF NOT EXISTS idx_contrataciones_estado ON contrataciones (estado_contratacion);

-- Datos Iniciales de Oficios
INSERT INTO oficios (nombre_oficio, especialidad_oficio) VALUES
('Carpintero', 'Muebles y aberturas'),
('Electricista', 'Instalaciones domiciliarias'),
('Albañil', 'Construcción en seco y húmedo'),
('Plomero', 'Instalación de agua y gas'),
('Sastre', 'Confección y arreglos'),
('Mecánico', 'Automotores y motos');

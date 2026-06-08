-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.oficios (
  id_oficio integer NOT NULL DEFAULT nextval('oficios_id_oficio_seq'::regclass),
  nombre_oficio character varying NOT NULL UNIQUE,
  especialidad_oficio character varying,
  CONSTRAINT oficios_pkey PRIMARY KEY (id_oficio)
);
CREATE TABLE public.clientes (
  id_cliente integer NOT NULL DEFAULT nextval('clientes_id_cliente_seq'::regclass),
  contraseña_cliente character varying NOT NULL,
  nombre_y_apellido_cliente character varying NOT NULL,
  dni_cliente integer NOT NULL UNIQUE CHECK (dni_cliente >= 1000000 AND dni_cliente <= 99999999),
  correo_cliente character varying NOT NULL UNIQUE,
  celular_cliente character varying NOT NULL,
  url_foto_perfil text,
  url_dni_frente text,
  url_dni_dorso text,
  fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  edad_cliente integer,
  CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente)
);
CREATE TABLE public.trabajadores (
  id_trabajador integer NOT NULL DEFAULT nextval('trabajadores_id_trabajador_seq'::regclass),
  contraseña_trabajador character varying NOT NULL,
  nombre_y_apellido_trabajador character varying NOT NULL,
  dni_trabajador integer NOT NULL UNIQUE,
  correo_trabajador character varying NOT NULL UNIQUE,
  nro_celular_trabajador character varying NOT NULL,
  constancia_policial boolean DEFAULT false,
  monotributo_trabajador text,
  matricula_trabajador character varying,
  certificado_trabajador text,
  url_foto_perfil text,
  url_dni_frente_trabajador text,
  url_dni_reverso_trabajador text,
  puntuacion numeric DEFAULT 0.00,
  fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  edad_trabajador integer,
  CONSTRAINT trabajadores_pkey PRIMARY KEY (id_trabajador)
);
CREATE TABLE public.oficio_del_trabajador (
  id_oficio integer NOT NULL,
  id_trabajador integer NOT NULL,
  CONSTRAINT oficio_del_trabajador_pkey PRIMARY KEY (id_oficio, id_trabajador),
  CONSTRAINT oficio_del_trabajador_id_oficio_fkey FOREIGN KEY (id_oficio) REFERENCES public.oficios(id_oficio),
  CONSTRAINT oficio_del_trabajador_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.trabajadores(id_trabajador)
);
CREATE TABLE public.publicaciones (
  id_publi integer NOT NULL DEFAULT nextval('publicaciones_id_publi_seq'::regclass),
  fecha_publi timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  tipo_urgencia character varying NOT NULL,
  descripcion_publi text NOT NULL,
  monotributo_publi boolean DEFAULT false,
  matricula_publi boolean DEFAULT false,
  certificado_publi boolean DEFAULT false,
  id_cliente integer,
  id_oficio integer,
  estado character varying DEFAULT 'Abierta'::character varying,
  estado_publi character varying DEFAULT 'Abierta'::character varying,
  CONSTRAINT publicaciones_pkey PRIMARY KEY (id_publi),
  CONSTRAINT publicaciones_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT publicaciones_id_oficio_fkey FOREIGN KEY (id_oficio) REFERENCES public.oficios(id_oficio)
);
CREATE TABLE public.postulaciones (
  id_postulacion integer NOT NULL DEFAULT nextval('postulaciones_id_postulacion_seq'::regclass),
  id_trabajador integer,
  id_publi integer,
  presupuesto numeric NOT NULL,
  materiales text,
  descripcion_postulacion text,
  fecha_postulacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT postulaciones_pkey PRIMARY KEY (id_postulacion),
  CONSTRAINT postulaciones_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.trabajadores(id_trabajador),
  CONSTRAINT postulaciones_id_publi_fkey FOREIGN KEY (id_publi) REFERENCES public.publicaciones(id_publi)
);
CREATE TABLE public.valoraciones (
  id_valoracion integer NOT NULL DEFAULT nextval('valoraciones_id_valoracion_seq'::regclass),
  puntuacion integer NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
  comentario text CHECK (comentario IS NULL OR length(comentario) <= 500),
  id_emisor_cliente integer NOT NULL,
  id_receptor_trabajador integer NOT NULL,
  fecha_valoracion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valoraciones_pkey PRIMARY KEY (id_valoracion),
  CONSTRAINT valoraciones_id_emisor_cliente_fkey FOREIGN KEY (id_emisor_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT valoraciones_id_receptor_trabajador_fkey FOREIGN KEY (id_receptor_trabajador) REFERENCES public.trabajadores(id_trabajador)
);
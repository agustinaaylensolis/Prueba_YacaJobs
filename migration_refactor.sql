-- MIGRACIÓN PARA REFACTORIZACIÓN DE MENSAJERÍA Y CONTRATACIÓN EN YACAJOBS
-- Ejecutar en el SQL Editor del dashboard de Supabase.

-- 1. ADAPTAR CLAVES FORÁNEAS PARA COMPORTAMIENTO EN CASCADA (ON DELETE CASCADE)
-- Mensajes: Si se borra la conversación, se borran sus mensajes
ALTER TABLE public.mensajes 
DROP CONSTRAINT IF EXISTS mensajes_id_conversacion_fkey;

ALTER TABLE public.mensajes 
ADD CONSTRAINT mensajes_id_conversacion_fkey 
FOREIGN KEY (id_conversacion) REFERENCES public.conversaciones(id_conversacion) ON DELETE CASCADE;

-- Contrataciones: Si se borra la conversación, se borra el contrato
ALTER TABLE public.contrataciones 
DROP CONSTRAINT IF EXISTS contrataciones_id_conversacion_fkey;

ALTER TABLE public.contrataciones 
ADD CONSTRAINT contrataciones_id_conversacion_fkey 
FOREIGN KEY (id_conversacion) REFERENCES public.conversaciones(id_conversacion) ON DELETE CASCADE;

-- 2. ASEGURAR CONVERSACIÓN ÚNICA ENTRE CLIENTE Y TRABAJADOR (FUSIÓN DE CHATS DUPLICADOS ANTERIORES)
-- 2a. Identificar duplicados y reasignar todos los mensajes de conversaciones anteriores a la conversación más nueva
WITH conversaciones_a_mantener AS (
    SELECT id_cliente, id_trabajador, MAX(id_conversacion) AS id_conversacion_valida
    FROM public.conversaciones
    GROUP BY id_cliente, id_trabajador
),
duplicados AS (
    SELECT c.id_conversacion, m.id_conversacion_valida
    FROM public.conversaciones c
    JOIN conversaciones_a_mantener m ON c.id_cliente = m.id_cliente AND c.id_trabajador = m.id_trabajador
    WHERE c.id_conversacion <> m.id_conversacion_valida
)
UPDATE public.mensajes m
SET id_conversacion = d.id_conversacion_valida
FROM duplicados d
WHERE m.id_conversacion = d.id_conversacion;

-- 2b. Eliminar contratos de las conversaciones duplicadas obsoletas
WITH conversaciones_a_mantener AS (
    SELECT id_cliente, id_trabajador, MAX(id_conversacion) AS id_conversacion_valida
    FROM public.conversaciones
    GROUP BY id_cliente, id_trabajador
),
duplicados AS (
    SELECT c.id_conversacion, m.id_conversacion_valida
    FROM public.conversaciones c
    JOIN conversaciones_a_mantener m ON c.id_cliente = m.id_cliente AND c.id_trabajador = m.id_trabajador
    WHERE c.id_conversacion <> m.id_conversacion_valida
)
DELETE FROM public.contrataciones
WHERE id_conversacion IN (SELECT id_conversacion FROM duplicados);

-- 2c. Borrar conversaciones duplicadas antiguas
WITH conversaciones_a_mantener AS (
    SELECT id_cliente, id_trabajador, MAX(id_conversacion) AS id_conversacion_valida
    FROM public.conversaciones
    GROUP BY id_cliente, id_trabajador
)
DELETE FROM public.conversaciones
WHERE id_conversacion NOT IN (SELECT id_conversacion_valida FROM conversaciones_a_mantener);

-- 2d. Eliminar la restricción de unicidad anterior si existe
ALTER TABLE public.conversaciones 
DROP CONSTRAINT IF EXISTS conversaciones_id_cliente_id_trabajador_id_publi_key;

-- 2e. Agregar la restricción única global por cliente-trabajador en conversaciones
ALTER TABLE public.conversaciones 
ADD CONSTRAINT conversaciones_cliente_trabajador_unique UNIQUE (id_cliente, id_trabajador);

-- 3. CREAR VISTA OPTIMIZADA PARA SOLUCIONAR CONSULTAS N+1 (MAPEO DE COLUMNAS ORIGINALES)
CREATE OR REPLACE VIEW public.v_resumen_conversaciones AS
SELECT 
    c.id_conversacion,
    c.id_cliente,
    c.id_trabajador,
    c.id_publi,
    c.id_postulacion,
    c.estado_conversacion,
    c.ultimo_mensaje_preview,
    c.ultima_actividad,
    c.fecha_creacion,
    
    -- Datos del cliente
    cli.nombre_y_apellido_cliente AS cliente_nombre,
    cli.url_foto_perfil AS cliente_avatar,
    
    -- Datos del trabajador
    tra.nombre_y_apellido_trabajador AS trabajador_nombre,
    tra.url_foto_perfil AS trabajador_avatar,
    tra.puntuacion AS trabajador_puntuacion,
    
    -- Contrato asociado mapeado a los nombres del DTO
    con.id_contratacion,
    con.estado_contratacion,
    con.monto_acordado AS monto,
    con.fecha_horario_acordado AS fecha_hora,
    con.direccion_o_zona AS direccion,
    con.detalle_acuerdo AS descripcion,
    con.materiales_incluidos,
    con.descripcion_materiales,
    con.monto_acordado,
    con.precio_final_acordado,
    con.fecha_horario_acordado,
    con.direccion_o_zona,
    con.condiciones_especiales,
    con.detalle_acuerdo,
    
    -- Conteo de mensajes no leídos para el cliente
    COALESCE((
        SELECT COUNT(*)::int
        FROM public.mensajes m
        WHERE m.id_conversacion = c.id_conversacion
          AND m.id_emisor_trabajador IS NOT NULL
          AND m.leido_por_cliente_at IS NULL
    ), 0) AS unread_count_cliente,
    
    -- Conteo de mensajes no leídos para el trabajador
    COALESCE((
        SELECT COUNT(*)::int
        FROM public.mensajes m
        WHERE m.id_conversacion = c.id_conversacion
          AND m.id_emisor_cliente IS NOT NULL
          AND m.leido_por_trabajador_at IS NULL
    ), 0) AS unread_count_trabajador

FROM public.conversaciones c
JOIN public.clientes cli ON c.id_cliente = cli.id_cliente
JOIN public.trabajadores tra ON c.id_trabajador = tra.id_trabajador
LEFT JOIN public.contrataciones con ON c.id_conversacion = con.id_conversacion;

-- 4. SEGURIDAD: CONTROL DE ACCESO MEDIANTE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrataciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversaciones_select_participantes ON public.conversaciones;
DROP POLICY IF EXISTS conversaciones_insert_authenticated ON public.conversaciones;
DROP POLICY IF EXISTS conversaciones_update_authenticated ON public.conversaciones;

DROP POLICY IF EXISTS mensajes_select_participantes ON public.mensajes;
DROP POLICY IF EXISTS mensajes_insert_authenticated ON public.mensajes;
DROP POLICY IF EXISTS mensajes_update_authenticated ON public.mensajes;

DROP POLICY IF EXISTS contrataciones_select_authenticated ON public.contrataciones;
DROP POLICY IF EXISTS contrataciones_insert_authenticated ON public.contrataciones;
DROP POLICY IF EXISTS contrataciones_update_authenticated ON public.contrataciones;

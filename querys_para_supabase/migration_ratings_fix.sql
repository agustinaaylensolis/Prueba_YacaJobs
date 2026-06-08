-- 1. CREACIÓN DEL TRIGGER PARA ACTUALIZAR AUTOMÁTICAMENTE LA PUNTUACIÓN DEL TRABAJADOR
-- Calcula el promedio (AVG) de todas las puntuaciones en la tabla 'valoraciones' para un trabajador dado
-- y actualiza la columna 'puntuacion' en la tabla 'trabajadores'.
CREATE OR REPLACE FUNCTION public.actualizar_puntuacion_trabajador()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_promedio NUMERIC(3,2);
    receptor_id INT;
BEGIN
    -- Determinar el ID del trabajador según la operación
    IF (TG_OP = 'DELETE') THEN
        receptor_id := OLD.id_receptor_trabajador;
    ELSE
        receptor_id := NEW.id_receptor_trabajador;
    END IF;

    -- Calcular el promedio redondeado a dos decimales
    SELECT COALESCE(ROUND(AVG(puntuacion), 2), 0.00)
    INTO nuevo_promedio
    FROM public.valoraciones
    WHERE id_receptor_trabajador = receptor_id;

    -- Actualizar el puntaje en la tabla de trabajadores
    UPDATE public.trabajadores
    SET puntuacion = nuevo_promedio
    WHERE id_trabajador = receptor_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger asociado a la tabla 'valoraciones'
DROP TRIGGER IF EXISTS trg_actualizar_puntuacion ON public.valoraciones;

CREATE TRIGGER trg_actualizar_puntuacion
AFTER INSERT OR UPDATE OR DELETE ON public.valoraciones
FOR EACH ROW EXECUTE FUNCTION public.actualizar_puntuacion_trabajador();


-- 2. INTEGRIDAD DE DATOS: AGREGAR RESTRICCIÓN UNIQUE COMPUESTA
-- Asegura que un cliente solo pueda calificar una vez a un mismo trabajador
ALTER TABLE public.valoraciones 
DROP CONSTRAINT IF EXISTS unica_valoracion_cliente_trabajador;

ALTER TABLE public.valoraciones 
ADD CONSTRAINT unica_valoracion_cliente_trabajador UNIQUE (id_emisor_cliente, id_receptor_trabajador);

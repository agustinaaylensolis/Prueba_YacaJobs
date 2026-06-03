import { supabase } from "./supabase";
import { Rating } from "../types";

export async function getWorkerRatings(workerId: number): Promise<Rating[]> {
  if (!workerId) {
    throw new Error("El ID del trabajador es requerido para obtener valoraciones.");
  }

  const { data, error } = await supabase
    .from("valoraciones")
    .select(
      `
      id_valoracion,
      puntuacion,
      comentario,
      id_emisor_cliente,
      id_receptor_trabajador,
      fecha_valoracion,
      clientes(nombre_y_apellido_cliente)
    `
    )
    .eq("id_receptor_trabajador", workerId)
    .order("fecha_valoracion", { ascending: false });

  if (error) {
    console.error("Error al obtener valoraciones del trabajador:", error);
    throw new Error(
      "No se pudieron cargar las valoraciones. Intenta nuevamente."
    );
  }

  // Mapear los datos para incluir el nombre del cliente directamente en el objeto Rating
  return (data as any[]).map((rating) => {
    const clientes = (rating as any).clientes;
    const nombreClienteFromRelation = Array.isArray(clientes)
      ? clientes[0]?.nombre_y_apellido_cliente
      : clientes?.nombre_y_apellido_cliente;

    return {
      ...rating,
      nombre_cliente: nombreClienteFromRelation ?? "Anónimo",
    } as Rating;
  });
}

export async function createWorkerRating(
  ratingData: Omit<Rating, "id_valoracion" | "fecha_valoracion" | "nombre_cliente">
): Promise<Rating> {
  const { puntuacion, comentario, id_emisor_cliente, id_receptor_trabajador } = ratingData;

  if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
    throw new Error("La puntuación debe ser entre 1 y 5.");
  }
  if (!id_emisor_cliente || !id_receptor_trabajador) {
    throw new Error("El emisor y el receptor son requeridos para crear una valoración.");
  }
  if (comentario && comentario.length > 500) {
    throw new Error("El comentario no puede exceder los 500 caracteres.");
  }

  // Validación de negocio: Cliente no puede valorarse a sí mismo
  if (id_emisor_cliente === id_receptor_trabajador) {
    throw new Error("No puedes valorarte a ti mismo.");
  }

  // FUTURE BUSINESS RULE: Aquí se podría añadir una validación para
  // determinar si el cliente autenticado puede valorar a este trabajador
  // (ej. basándose en un contrato finalizado o un trabajo realizado).
  // La lógica detallada debería residir en el backend.

  // Verificar si el cliente ya valoró a este trabajador (usando la restricción de DB)
  const { data: existingRating, error: checkError } = await supabase
    .from("valoraciones")
    .select("id_valoracion")
    .eq("id_emisor_cliente", id_emisor_cliente)
    .eq("id_receptor_trabajador", id_receptor_trabajador);

  if (checkError) {
    console.error("Error al verificar valoración existente:", checkError);
    throw new Error("Ocurrió un error al intentar crear la valoración.");
  }

  if (existingRating && existingRating.length > 0) {
    throw new Error("Ya has valorado a este trabajador.");
  }

  const { data, error } = await supabase
    .from("valoraciones")
    .insert([
      {
        puntuacion,
        comentario,
        id_emisor_cliente,
        id_receptor_trabajador,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error al crear valoración:", error);
    throw new Error("No se pudo registrar la valoración. Intenta nuevamente.");
  }

  // Retornar la valoración creada, incluyendo el nombre del cliente si fuera necesario
  // En este punto, no tenemos el nombre del cliente del emisor directamente de la inserción
  // Si se necesita, habría que hacer una consulta adicional o modificar el retorno de la API
  return data as Rating;
}

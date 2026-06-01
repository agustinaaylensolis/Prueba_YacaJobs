/**
 * SearchProfileStrategy - Estrategia concreta #3 del patrón Strategy
 *
 * Rol en el patrón:
 *   Encapsula la lógica de búsqueda para obtener el PERFIL DETALLADO de un trabajador.
 *   Implementa el contrato SearchStrategy.
 *
 * Responsabilidad ÚNICA (Single Responsibility Principle):
 *   Sabe CÓMO hacer fetch a GET /api/jobs/workers/:workerId
 *   Incluye error handling detallado (JSON parsing fallido, response no ok, etc.)
 *   No sabe de React, estados, UI, o cómo se usa el resultado
 *
 * Antes (en App.tsx):
 *   handleViewWorkerProfile(workerId) → fetch con JSON parsing + error handling complejo
 *
 * Ahora (delegado aquí):
 *   execute({ workerId }) → fetch + JSON parsing + error handling
 *
 * Ventaja:
 *   Si cambia la lógica de carga de perfil, cambio solo esta clase.
 *   App.tsx no sabe los detalles de JSON parsing o validación de respuesta.
 *   El error handling es centralizado en una sola clase.
 */

import { SearchStrategy } from './SearchStrategy';

export class SearchProfileStrategy implements SearchStrategy {
  /**
   * Obtiene el perfil detallado de un trabajador específico.
   *
   * Incluye:
   *   - Información básica del trabajador
   *   - Oficios que realiza
   *   - Reseñas/comentarios
   *   - Estadísticas de trabajo
   *
   * @param params - Objeto con { workerId: number }
   *                 workerId es el ID del trabajador
   * @returns Promesa con Worker (objeto detallado con perfil completo)
   * @throws Error si la búsqueda falla, respuesta no es ok, o JSON parsing falla
   */
  async execute(params: any): Promise<any> {
    const { workerId } = params;

    // Validación: si no hay workerId, no hacer fetch
    if (!workerId) {
      throw new Error('SearchProfileStrategy: workerId es requerido');
    }

    try {
      const url = `/api/jobs/workers/${workerId}`;
      const res = await fetch(url);

      // Intentar parsear JSON incluso si response no es ok
      // (backend podría retornar error message en JSON)
      const payload = await res.json().catch(() => ({}));

      // Si response no es ok, lanzar error con mensaje del servidor o genérico
      if (!res.ok) {
        const errorMessage = payload.message || `Error ${res.status}: No se pudo cargar el perfil.`;
        throw new Error(errorMessage);
      }

      return payload;
    } catch (error: any) {
      console.error('Error en SearchProfileStrategy:', error);
      throw error;
    }
  }
}

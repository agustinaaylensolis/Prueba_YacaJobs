/**
 * SearchByTextStrategy - Estrategia concreta del patrón Strategy
 *
 * Rol en el patrón:
 *   Encapsula la lógica de búsqueda de trabajadores por texto libre.
 *   Busca tanto en nombre_y_apellido_trabajador como en nombre_oficio.
 *   Implementa el contrato SearchStrategy.
 *
 * Responsabilidad ÚNICA (Single Responsibility Principle):
 *   Sabe CÓMO hacer fetch a GET /api/jobs/workers/search?q=texto
 *   Valida que el query no esté vacío
 *   No sabe de React, estados, UI, o cómo se usa el resultado
 *
 * Uso:
 *   strategy = SearchStrategyFactory.create('by-text')
 *   results = await strategy.execute({ query: 'plomero' })
 *
 * Ventaja:
 *   Si cambia la lógica de búsqueda textual, cambio solo esta clase.
 *   App.tsx no sabe los detalles de cómo se busca por texto.
 */

import { SearchStrategy } from './SearchStrategy';

export class SearchByTextStrategy implements SearchStrategy {
  /**
   * Busca trabajadores por texto libre (nombre o oficio).
   *
   * @param params - Objeto con { query: string }
   *                 query es el texto a buscar (nombre de trabajador u oficio)
   * @returns Promesa con Worker[] - Lista de trabajadores que coinciden
   * @throws Error si la búsqueda falla o si query no se proporciona
   */
  async execute(params: any): Promise<any> {
    const { query } = params;

    // Validación: si no hay query, retornar array vacío
    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.warn('SearchByTextStrategy: query vacío, retornando []');
      return [];
    }

    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const url = `/api/jobs/workers/search?q=${encodedQuery}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Error ${res.status}: No se pudieron obtener resultados de búsqueda`);
      }

      const data = await res.json();
      return data || [];
    } catch (error: any) {
      console.error('Error en SearchByTextStrategy:', error);
      throw error;
    }
  }
}
/**
 * SearchByTradeStrategy - Estrategia concreta #2 del patrón Strategy
 *
 * Rol en el patrón:
 *   Encapsula la lógica de búsqueda para obtener trabajadores POR OFICIO específico.
 *   Implementa el contrato SearchStrategy.
 *
 * Responsabilidad ÚNICA (Single Responsibility Principle):
 *   Sabe CÓMO hacer fetch a GET /api/jobs/workers?tradeId=X
 *   Valida que tradeId existe
 *   No sabe de React, estados, UI, o cómo se usa el resultado
 *
 * Antes (en App.tsx):
 *   handleSearch(tradeId) → fetch(`/api/jobs/workers?tradeId=${tradeId}`)
 *
 * Ahora (delegado aquí):
 *   execute({ tradeId }) → fetch(`/api/jobs/workers?tradeId=${tradeId}`)
 *
 * Ventaja:
 *   Si cambia la lógica de filtrado por oficio, cambio solo esta clase.
 *   App.tsx no sabe los detalles de cómo se busca por oficio.
 */

import { SearchStrategy } from './SearchStrategy';

export class SearchByTradeStrategy implements SearchStrategy {
  /**
   * Obtiene la lista de trabajadores que tienen un oficio específico.
   *
   * @param params - Objeto con { tradeId: number }
   *                 tradeId es el ID del oficio a filtrar
   * @returns Promesa con Worker[] - Lista de trabajadores con ese oficio
   * @throws Error si la búsqueda falla o si tradeId no se proporciona
   */
  async execute(params: any): Promise<any> {
    const { tradeId } = params;

    // Validación: si no hay tradeId, no hacer fetch
    if (!tradeId) {
      console.warn('SearchByTradeStrategy: tradeId no proporcionado');
      return [];
    }

    try {
      const url = `/api/jobs/workers?tradeId=${tradeId}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Error ${res.status}: No se pudieron obtener trabajadores para el oficio`);
      }

      const data = await res.json();
      return data || [];
    } catch (error: any) {
      console.error('Error en SearchByTradeStrategy:', error);
      throw error;
    }
  }
}

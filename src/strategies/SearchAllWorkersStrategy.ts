/**
 * SearchAllWorkersStrategy - Estrategia concreta #1 del patrón Strategy
 *
 * Rol en el patrón:
 *   Encapsula la lógica de búsqueda para obtener TODOS los trabajadores.
 *   Implementa el contrato SearchStrategy.
 *
 * Responsabilidad ÚNICA (Single Responsibility Principle):
 *   Sabe CÓMO hacer fetch a GET /api/jobs/workers
 *   No sabe de React, estados, UI, o cómo se usa el resultado
 *
 * Antes (en App.tsx):
 *   handleSearch() sin parámetros → fetch('/api/jobs/workers')
 *
 * Ahora (delegado aquí):
 *   execute({}) → fetch('/api/jobs/workers')
 *
 * Ventaja:
 *   Si cambia el endpoint o la lógica de fetch, cambio solo esta clase.
 *   App.tsx no sabe los detalles de cómo se buscan todos los trabajadores.
 */

import { SearchStrategy } from './SearchStrategy';

export class SearchAllWorkersStrategy implements SearchStrategy {
  /**
   * Obtiene la lista completa de todos los trabajadores.
   *
   * @param params - Objeto vacío {} (no requiere parámetros)
   * @returns Promesa con Worker[] - Lista de todos los trabajadores
   * @throws Error si la búsqueda falla
   */
  async execute(params: any): Promise<any> {
    try {
      const res = await fetch('/api/jobs/workers');

      if (!res.ok) {
        throw new Error(`Error ${res.status}: No se pudo obtener trabajadores`);
      }

      const data = await res.json();
      return data || [];
    } catch (error: any) {
      console.error('Error en SearchAllWorkersStrategy:', error);
      throw error;
    }
  }
}

/**
 * SearchStrategyFactory - Factory del patrón Strategy
 *
 * Rol en el patrón:
 *   Centraliza la CREACIÓN y SELECCIÓN de estrategias concretas.
 *   Evita que App.tsx tenga lógica de "if/else" para decidir qué estrategia usar.
 *
 * Responsabilidad ÚNICA (Single Responsibility Principle):
 *   Mapear un tipo de búsqueda (string) a su estrategia correspondiente.
 *   Si hay que agregar nueva estrategia, cambio solo esta clase.
 *
 * Principio aplicado:
 *   Factory Pattern: Desacopla creación de objetos de su uso
 *   Open/Closed Principle: ABIERTO a nuevas estrategias, CERRADO a modificación
 *
 * Uso en App.tsx:
 *   strategy = SearchStrategyFactory.create('by-trade')
 *   results = await strategy.execute({ tradeId: 42 })
 *
 * Ventaja:
 *   Si creo SearchByTextStrategy, solo agrego un case aquí.
 *   App.tsx no cambia en absoluto.
 */

import { SearchStrategy } from './SearchStrategy';
import { SearchAllWorkersStrategy } from './SearchAllWorkersStrategy';
import { SearchByTradeStrategy } from './SearchByTradeStrategy';
import { SearchByTextStrategy } from './SearchByTextStrategy';
import { SearchProfileStrategy } from './SearchProfileStrategy';

export class SearchStrategyFactory {
  /**
   * Crea y retorna la estrategia correspondiente al tipo especificado.
   *
   * @param type - Tipo de búsqueda:
   *               - 'all-workers': obtener todos los trabajadores
   *               - 'by-trade': obtener trabajadores por oficio
   *               - 'profile': obtener perfil detallado de un trabajador
   *
   * @returns Instancia de estrategia que implementa SearchStrategy
   *
   * @throws Error si el tipo no es reconocido
   *
   * Ejemplo:
   *   const strategy = SearchStrategyFactory.create('by-trade');
   *   const results = await strategy.execute({ tradeId: 5 });
   */
  static create(type: string): SearchStrategy {
    switch (type) {
      case 'all-workers':
        return new SearchAllWorkersStrategy();

      case 'by-trade':
        return new SearchByTradeStrategy();

      case 'by-text':
        return new SearchByTextStrategy();

      case 'profile':
        return new SearchProfileStrategy();

      default:
        throw new Error(
          `Tipo de estrategia no reconocido: "${type}". Tipos válidos: all-workers, by-trade, by-text, profile`
        );
    }
  }
}

/**
 * SearchStrategy - Interfaz base del patrón Strategy
 *
 * Rol en el patrón:
 *   Define el contrato común que todas las estrategias de búsqueda deben implementar.
 *   Actúa como punto de extensión: permite agregar nuevas estrategias sin modificar el código existente.
 *
 * Principio SOLID aplicado:
 *   - Interface Segregation Principle: Define solo lo esencial (método execute)
 *   - Dependency Inversion Principle: Las clientes dependen de esta abstracción, no de implementaciones
 *
 * Uso:
 *   Las clases concretas (SearchByTradeStrategy, SearchAllWorkersStrategy, etc.)
 *   implementan esta interfaz y definen su propia lógica de búsqueda.
 */

export interface SearchStrategy {
  /**
   * Ejecuta la estrategia de búsqueda con los parámetros especificados.
   *
   * @param params - Objeto con parámetros específicos de cada estrategia
   *                 Ejemplo: { tradeId: 42 } para búsqueda por oficio
   *                          { workerId: 99 } para búsqueda de perfil
   *                          {} para búsqueda general
   *
   * @returns Promesa que resuelve con los resultados de la búsqueda
   *          - SearchAllWorkersStrategy: Worker[]
   *          - SearchByTradeStrategy: Worker[]
   *          - SearchProfileStrategy: Worker (objeto detallado)
   *
   * @throws Error si la búsqueda falla (red, servidor, etc.)
   */
  execute(params: any): Promise<any>;
}

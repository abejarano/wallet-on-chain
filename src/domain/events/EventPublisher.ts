/**
 * Publicador genérico de eventos de dominio. Permite reutilizar el mismo
 * puerto para diferentes flujos (retiros, creación de wallets, etc).
 */
export interface IEventPublisher<TEvent> {
  publish(event: TEvent): Promise<void>
}

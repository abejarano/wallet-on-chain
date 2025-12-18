import { EventsType } from "../enums/events.type.enum"

export interface IEventService {
  publish<T>(event: { event: EventsType; data: T }): Promise<void>
  //subscribe(handler: (event: ) => Promise<void>): void
}

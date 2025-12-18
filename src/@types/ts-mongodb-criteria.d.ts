declare module "@abejarano/ts-mongodb-criteria" {
  export type Criteria<T> = Partial<Record<keyof T, any>> & Record<string, any>

  export interface Paginate<T> {
    data: T[]
    meta?: any
  }

  export abstract class MongoRepository<T> {
    abstract collectionName(): string
    protected collection<TDoc = any>(): Promise<TDoc>
    protected searchByCriteria<TDoc = any>(criteria: Criteria<T>): Promise<TDoc[]>
    protected paginate<TDoc = any>(docs: TDoc[]): Paginate<TDoc>
    protected persist(id: string | undefined, entity: any): Promise<void>
  }
}

import {
  ISealedSecret,
  ISealedSecretRepository,
} from "@/domain/wallet/SealedSecretRepository"
import { MongoRepository } from "@abejarano/ts-mongodb-criteria"

export class MongoSealedSecretRepository
  extends MongoRepository<ISealedSecret>
  implements ISealedSecretRepository
{
  private static _instance: MongoSealedSecretRepository

  static instance(): MongoSealedSecretRepository {
    if (!this._instance) {
      this._instance = new MongoSealedSecretRepository()
    }
    return this._instance
  }

  collectionName(): string {
    return "sealedSecrets"
  }

  save(secret: ISealedSecret): Promise<ISealedSecret> {
    return this.persist(secret.id, secret).then(() => secret)
  }

  async findById(id: string): Promise<ISealedSecret | null> {
    const collection = await this.collection<any>()
    const found = await collection.findOne({ id })
    if (!found) return null
    return {
      ...found,
      id: found.id ?? found._id?.toString?.(),
    } as ISealedSecret
  }
}

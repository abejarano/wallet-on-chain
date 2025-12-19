import { IHdWalletIndexRepository } from "@/domain/wallet/interface"
import { MongoRepository } from "@abejarano/ts-mongodb-criteria"

type HdIndexDoc = { sealedSecretId: string; current?: number }

export class MongoHdWalletIndexRepository
  extends MongoRepository<HdIndexDoc>
  implements IHdWalletIndexRepository
{
  private static _instance: MongoHdWalletIndexRepository

  static instance(): MongoHdWalletIndexRepository {
    if (!this._instance) {
      this._instance = new MongoHdWalletIndexRepository()
    }
    return this._instance
  }

  collectionName(): string {
    return "hdWalletIndexes"
  }

  async reserveNextIndex(sealedSecretId: string): Promise<number> {
    const collection = await this.collection<any>()
    const result = await collection.findOneAndUpdate(
      { sealedSecretId },
      { $inc: { current: 1 } },
      { upsert: true, returnDocument: "after" }
    )
    return result?.value?.current ?? 0
  }
}

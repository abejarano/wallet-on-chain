import { IWalletRecord, IWalletRepository } from "@/domain/wallet/interface"
import { MongoRepository } from "@abejarano/ts-mongodb-criteria"

export class MongoWalletRepository
  extends MongoRepository<IWalletRecord>
  implements IWalletRepository
{
  private static _instance: MongoWalletRepository

  static instance(): MongoWalletRepository {
    if (!this._instance) {
      this._instance = new MongoWalletRepository()
    }
    return this._instance
  }

  collectionName(): string {
    return "wallets"
  }

  save(wallet: IWalletRecord): Promise<IWalletRecord> {
    return this.persist(wallet.walletId, wallet).then(() => wallet)
  }

  async one(filter: object): Promise<IWalletRecord | null> {
    const collection = await this.collection<any>()
    const found = await collection.findOne(filter)
    if (!found) return null
    return {
      ...found,
      walletId: found.walletId ?? found._id?.toString?.(),
    } as IWalletRecord
  }
}

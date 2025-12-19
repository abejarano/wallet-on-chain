import { IWalletRecord } from "@/domain/wallet/interface"

export interface IDerivedWalletKey {
  wallet: IWalletRecord
  privateKey: Buffer
  publicKey: Buffer
  compressedPublicKey: Buffer
  derivationPath: string
}

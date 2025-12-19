import { IWalletRecord } from "@/domain/wallet/interface"
import { WithdrawalAsset } from "@/domain/withdrawal/interfaces/assets"

export interface IWithdrawalMessage {
  clientId: string
  asset: WithdrawalAsset
  amount: string // unidades del asset (ej: "0.01")
  toAddress: string
  withdrawalId: string
  wallet: IWalletRecord
}

import { WithdrawalStatus } from "@/domain/withdrawal/enums/WithdrawalStatus.enum"
import { WithdrawalAsset } from "@/domain/withdrawal/interfaces/assets"

export interface IWithdrawalEvent {
  clientId: string
  withdrawalId: string
  asset: WithdrawalAsset
  status: WithdrawalStatus
  amount: string
  toAddress: string
  reason?: string
  balanceAvailable?: string
  txid?: string
}

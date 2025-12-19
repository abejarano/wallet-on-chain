import { WithdrawalAsset } from "@/domain/withdrawal/interfaces/assets"
import { WithdrawalContext } from "@/domain/withdrawal/types/context"
import { BroadcastResult } from "@/domain/withdrawal/types/broadcast"

export interface IChainWithdrawalAdapter {
  supports(asset: WithdrawalAsset): boolean
  execute(ctx: WithdrawalContext): Promise<BroadcastResult>
}

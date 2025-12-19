import { IWalletRepository } from "@/domain/wallet/interface"
import { WithdrawalService } from "@/application/withdrawal/WithdrawalService"
import {
  IWithdrawalMessage,
  WithdrawalAsset,
} from "@/domain/withdrawal/interfaces"

export interface BrokerWithdrawalPayload {
  clientId: string
  withdrawalId: string
  asset: string
  amount: string
  toAddress: string
}

export class WithdrawalMessageHandler {
  constructor(
    private readonly walletRepo: IWalletRepository,
    private readonly withdrawalService: WithdrawalService
  ) {}

  async handle(payload: BrokerWithdrawalPayload): Promise<void> {
    const asset = this.normalizeAsset(payload.asset)
    const wallet = await this.walletRepo.one({
      ownerId: payload.clientId,
      assetCode: asset,
    })

    if (!wallet) {
      throw new Error(
        `No se encontró wallet para ${payload.clientId} / ${asset}`
      )
    }

    const message: IWithdrawalMessage = {
      clientId: payload.clientId,
      withdrawalId: payload.withdrawalId,
      asset,
      amount: payload.amount,
      toAddress: payload.toAddress,
      wallet,
    }

    await this.withdrawalService.processWithdrawal(message)
  }

  private normalizeAsset(asset: string): WithdrawalAsset {
    const upper = asset.toUpperCase()
    const supported: WithdrawalAsset[] = [
      "BTC",
      "ETH",
      "USDT-ERC20",
      "TRX",
      "USDT-TRC20",
    ]

    if ((supported as string[]).includes(upper)) {
      return upper as WithdrawalAsset
    }

    throw new Error(`Asset ${asset} no soportado`)
  }
}

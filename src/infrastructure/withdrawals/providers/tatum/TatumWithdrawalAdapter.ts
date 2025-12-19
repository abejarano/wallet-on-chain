import {
  BroadcastResult,
  IChainWithdrawalAdapter,
  WithdrawalAsset,
  WithdrawalContext,
} from "@/domain/withdrawal/interfaces"
import { TatumClient } from "@/infrastructure/withdrawals/providers/tatum/TatumClient"

/**
 * Adapter para usar Tatum como proveedor de broadcast. Firma localmente y envía rawTx.
 * Configura API key/URL mediante variables de entorno.
 */
export class TatumWithdrawalAdapter implements IChainWithdrawalAdapter {
  private readonly supported: WithdrawalAsset[] = [
    "BTC",
    "ETH",
    "USDT-ERC20",
    "TRX",
    "USDT-TRC20",
  ]

  constructor(private readonly client = new TatumClient()) {}

  supports(asset: WithdrawalAsset): boolean {
    return this.supported.includes(asset)
  }

  async execute(ctx: WithdrawalContext): Promise<BroadcastResult> {
    return this.client.broadcast(ctx)
  }
}

import {
  BroadcastResult,
  IChainWithdrawalAdapter,
  WithdrawalAsset,
  WithdrawalContext,
} from "@/domain/withdrawal/interfaces"
import { BitcoinRpcClient } from "@/infrastructure/withdrawals/providers/rpc/clients/BitcoinRpcClient"
import { EthereumRpcClient } from "@/infrastructure/withdrawals/providers/rpc/clients/EthereumRpcClient"
import { TronRpcClient } from "@/infrastructure/withdrawals/providers/rpc/clients/TronRpcClient"

/**
 * Adapter base para nodos propios vía RPC. Implementa el broadcast usando tus nodos
 * (Bitcoin Core, Geth/Nethermind, TronGrid). Firma localmente y envía rawTx.
 */
export class NodeRpcWithdrawalAdapter implements IChainWithdrawalAdapter {
  private readonly supported: WithdrawalAsset[] = [
    "BTC",
    "ETH",
    "USDT-ERC20",
    "TRX",
    "USDT-TRC20",
  ]

  constructor(
    private readonly bitcoinClient = new BitcoinRpcClient(),
    private readonly ethereumClient = new EthereumRpcClient(),
    private readonly tronClient = new TronRpcClient()
  ) {}

  supports(asset: WithdrawalAsset): boolean {
    return this.supported.includes(asset)
  }

  async execute(_ctx: WithdrawalContext): Promise<BroadcastResult> {
    throw new Error(
      "NodeRpcWithdrawalAdapter: implementa UTXO/nonce fetch, construcción de rawTx y broadcast via RPC"
    )
  }
}

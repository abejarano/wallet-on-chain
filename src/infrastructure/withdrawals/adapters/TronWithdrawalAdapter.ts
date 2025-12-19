import {
  BroadcastResult,
  IChainWithdrawalAdapter,
  WithdrawalAsset,
  WithdrawalContext,
} from "@/domain/withdrawal/interfaces"
import { HdWalletKeyService } from "@/infrastructure/withdrawals/keys/HdWalletKeyService"
import {
  ITronTokenConfig,
  ITronWebClient,
} from "@/infrastructure/withdrawals/interface"

export class TronWithdrawalAdapter implements IChainWithdrawalAdapter {
  private readonly supportedAssets: WithdrawalAsset[] = ["TRX", "USDT-TRC20"]

  constructor(
    private readonly tronWeb: ITronWebClient,
    private readonly keyService: HdWalletKeyService,
    private readonly tokenConfig: Record<string, ITronTokenConfig> = {}
  ) {}

  supports(asset: WithdrawalAsset): boolean {
    return this.supportedAssets.includes(asset)
  }

  async execute(ctx: WithdrawalContext): Promise<BroadcastResult> {
    const { request, amountInMinorUnits } = ctx
    const { wallet, asset, toAddress } = request
    const derived = await this.keyService.deriveWalletKey(wallet)
    const privateKeyHex = derived.privateKey.toString("hex")

    if (asset === "TRX") {
      const amountSun = this.ensureSafeNumber(amountInMinorUnits)
      const unsignedTx = await this.tronWeb.transactionBuilder.sendTrx(
        toAddress,
        amountSun,
        wallet.address
      )
      const signedTx = await this.tronWeb.trx.sign(unsignedTx, privateKeyHex)
      const broadcast = await this.tronWeb.trx.sendRawTransaction(signedTx)
      this.ensureBroadcastSuccess(broadcast)
      return { txid: broadcast.txid ?? signedTx.txID }
    }

    const token = this.tokenConfig[asset]
    if (!token) {
      throw new Error(`No hay configuración para el token ${asset}`)
    }

    const ownerHex = this.tronWeb.address.toHex(wallet.address)
    const trigger = await this.tronWeb.transactionBuilder.triggerSmartContract(
      token.address,
      "transfer(address,uint256)",
      { feeLimit: token.feeLimitSun },
      [
        { type: "address", value: toAddress },
        { type: "uint256", value: amountInMinorUnits.toString() },
      ],
      ownerHex
    )

    if (!trigger.transaction) {
      throw new Error("El nodo Tron no devolvió una transacción válida")
    }

    const signedTx = await this.tronWeb.trx.sign(
      trigger.transaction,
      privateKeyHex
    )
    const broadcast = await this.tronWeb.trx.sendRawTransaction(signedTx)
    this.ensureBroadcastSuccess(broadcast)
    return { txid: broadcast.txid ?? signedTx.txID }
  }

  private ensureSafeNumber(amount: bigint): number {
    if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(
        "El monto TRX excede el límite seguro para conversión numérica"
      )
    }
    return Number(amount)
  }

  private ensureBroadcastSuccess(resp: { result?: boolean; txid?: string }) {
    if (!resp.result) {
      throw new Error(
        `El nodo Tron respondió sin éxito: ${JSON.stringify(resp)}`
      )
    }
  }
}

import {
  BroadcastResult,
  WithdrawalAsset,
  WithdrawalContext,
} from "@/domain/withdrawal/interfaces"
import { PROVIDERS } from "@/config/app.constants"

/**
 * Cliente HTTP para CryptoAPIs. Firma localmente; esto solo envía rawTx para broadcast.
 */
export class CryptoApiClient {
  private readonly apiUrl = PROVIDERS.cryptoapis.apiUrl
  private readonly apiKey = PROVIDERS.cryptoapis.apiKey || ""

  async broadcast(ctx: WithdrawalContext): Promise<BroadcastResult> {
    if (!this.apiKey) {
      throw new Error("CryptoApiClient: CRYPTOAPIS_API_KEY no configurada")
    }
    // TODO: construir payload por asset y llamar POST /{asset}/transactions/broadcast
    throw new Error("CryptoApiClient.broadcast no implementado")
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async registerXpub(_asset: WithdrawalAsset, _xpub: string): Promise<void> {
    // TODO: registrar XPUB para monitoreo de depósitos en CryptoAPIs
    throw new Error("CryptoApiClient.registerXpub no implementado")
  }
}

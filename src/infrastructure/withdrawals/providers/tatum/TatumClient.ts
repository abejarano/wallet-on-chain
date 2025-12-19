import {
  BroadcastResult,
  WithdrawalAsset,
  WithdrawalContext,
} from "@/domain/withdrawal/interfaces"
import { PROVIDERS } from "@/config/app.constants"

/**
 * Cliente HTTP para Tatum. Firma localmente; esto solo envía rawTx a Tatum para broadcast.
 */
export class TatumClient {
  private readonly apiUrl = PROVIDERS.tatum.apiUrl
  private readonly apiKey = PROVIDERS.tatum.apiKey || ""

  async broadcast(ctx: WithdrawalContext): Promise<BroadcastResult> {
    if (!this.apiKey) {
      throw new Error("TatumClient: TATUM_API_KEY no configurada")
    }

    // TODO: construir payload según asset y llamar POST /broadcast de Tatum.
    // Devolver txid de la respuesta.
    throw new Error("TatumClient.broadcast no implementado")
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async registerXpub(_asset: WithdrawalAsset, _xpub: string): Promise<void> {
    // TODO: usar endpoint de suscripción para depósitos
    throw new Error("TatumClient.registerXpub no implementado")
  }
}

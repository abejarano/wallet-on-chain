import { ILedgerGateway } from "@/domain/withdrawal/interfaces"

/**
 * Skeleton de gateway HTTP hacia epic-ledger-api (o el ledger que uses).
 * Reemplaza los TODO con las llamadas REST/gRPC reales.
 */
export class LedgerHttpGateway implements ILedgerGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  async getAvailableBalance(
    _clientId: string,
    _asset: string
  ): Promise<bigint> {
    throw new Error("LedgerHttpGateway.getAvailableBalance no implementado")
  }

  async reserveFunds(params: {
    clientId: string
    asset: string
    amount: bigint
    withdrawalId: string
  }): Promise<void> {
    void params
    throw new Error("LedgerHttpGateway.reserveFunds no implementado")
  }

  async releaseReservation(params: {
    clientId: string
    asset: string
    amount: bigint
    withdrawalId: string
    reason: string
  }): Promise<void> {
    void params
    throw new Error("LedgerHttpGateway.releaseReservation no implementado")
  }

  async markWithdrawalCompleted(params: {
    clientId: string
    asset: string
    amount: bigint
    withdrawalId: string
    txid: string
  }): Promise<void> {
    void params
    throw new Error("LedgerHttpGateway.markWithdrawalCompleted no implementado")
  }
}

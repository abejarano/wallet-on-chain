export interface ILedgerGateway {
  getAvailableBalance(clientId: string, asset: string): Promise<bigint>
  reserveFunds(params: {
    clientId: string
    asset: string
    amount: bigint
    withdrawalId: string
  }): Promise<void>
  releaseReservation(params: {
    clientId: string
    asset: string
    amount: bigint
    withdrawalId: string
    reason: string
  }): Promise<void>
  markWithdrawalCompleted(params: {
    clientId: string
    asset: string
    amount: bigint
    withdrawalId: string
    txid: string
  }): Promise<void>
}

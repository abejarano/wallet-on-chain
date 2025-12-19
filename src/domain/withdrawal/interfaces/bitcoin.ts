export interface IBitcoinNodePsbtResponse {
  psbt: string
  fee: number
  changePosition: number
}

export interface IBitcoinFinalizePsbtResult {
  hex: string
  complete: boolean
}

export interface IBitcoinNodeClient {
  walletCreateFundedPsbt(params: {
    toAddress: string
    amountSats: bigint
    changeAddress?: string
  }): Promise<IBitcoinNodePsbtResponse>
  finalizePsbt(psbtBase64: string): Promise<IBitcoinFinalizePsbtResult>
  sendRawTransaction(rawTx: string): Promise<string>
}

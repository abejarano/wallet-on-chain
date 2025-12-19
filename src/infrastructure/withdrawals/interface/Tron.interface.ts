export interface ITronTokenConfig {
  address: string
  feeLimitSun: number
}

export interface ITronWebClient {
  address: {
    toHex(address: string): string
  }
  transactionBuilder: {
    sendTrx(to: string, amount: number, from: string): Promise<any>
    triggerSmartContract(
      contractAddress: string,
      functionSelector: string,
      options: { feeLimit: number },
      params: Array<{ type: string; value: string }>,
      ownerAddress: string
    ): Promise<{ transaction?: any }>
  }
  trx: {
    sign(transaction: any, privateKey: string): Promise<any>
    sendRawTransaction(
      signedTransaction: any
    ): Promise<{ result?: boolean; txid?: string }>
  }
}

/**
 * Cliente RPC para Bitcoin Core (wallet deshabilitada).
 * Configura URL/credenciales RPC (rpcuser/rpcpassword) y usa métodos getunspent, estimatesmartfee, sendrawtransaction.
 */
export class BitcoinRpcClient {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchUtxos(_address: string): Promise<any[]> {
    throw new Error("BitcoinRpcClient.fetchUtxos no implementado")
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async estimateFeePerKb(): Promise<number> {
    throw new Error("BitcoinRpcClient.estimateFeePerKb no implementado")
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async broadcast(rawTx: string): Promise<string> {
    throw new Error("BitcoinRpcClient.broadcast no implementado")
  }
}

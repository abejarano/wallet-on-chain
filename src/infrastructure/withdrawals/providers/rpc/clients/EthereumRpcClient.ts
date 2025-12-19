/**
 * Cliente RPC para Ethereum (Geth/Nethermind). Obtiene nonce/gas y broadcast rawTx.
 */
export class EthereumRpcClient {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getNonce(_address: string): Promise<number> {
    throw new Error("EthereumRpcClient.getNonce no implementado")
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async estimateGasPrice(): Promise<bigint> {
    throw new Error("EthereumRpcClient.estimateGasPrice no implementado")
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async broadcast(rawTx: string): Promise<string> {
    throw new Error("EthereumRpcClient.broadcast no implementado")
  }
}

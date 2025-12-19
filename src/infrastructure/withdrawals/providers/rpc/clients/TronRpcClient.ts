/**
 * Cliente para TronGrid/nodo Tron. Obtiene datos de red y hace broadcast de transacciones firmadas.
 */
export class TronRpcClient {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getBandwidth(_address: string): Promise<any> {
    throw new Error("TronRpcClient.getBandwidth no implementado")
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async broadcast(rawTx: any): Promise<string> {
    throw new Error("TronRpcClient.broadcast no implementado")
  }
}

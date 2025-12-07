// src/withdrawals/WithdrawalService.ts
import {
  KeyManagerInterface,
  WalletRecord,
} from "@/crypto/KeyManager.interface" // ... otros imports

// ... otros imports

export class WithdrawalService {
  constructor(
    private keyManager: KeyManagerInterface /*, otros deps: ledger, nodeClient, etc. */
  ) {}

  async processWithdrawal(msg: {
    withdrawalRequestId: string
    wallet: WalletRecord
    digest: Buffer
    // ... otros campos: chain, rawTx, etc.
  }) {
    // 1) Firmar digest
    const signature = await this.keyManager.signDigest({
      wallet: msg.wallet,
      digest: msg.digest,
    })

    // 2) Montar la TX firmada (BTC, ETH, TRX) usando {r,s,v}
    // 3) Enviar TX al nodo
    // 4) Emitir evento al broker con status BROADCASTED / CONFIRMED, etc.
  }
}

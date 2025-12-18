import {
  Chain,
  IDeriveAddressInput,
  IKeyManager,
  IWalletRecord,
  IWalletRepository,
} from "@/domain/wallet/KeyManager"

type walletCommand =
  | {
      type: "CREATE_WALLET"
      ownerId: string
      chain: Chain
      assetCode: string
    }
  | {
      type: "DERIVE_ADDRESS"
      walletId: string
    }

export class WalletCommand {
  constructor(
    private readonly keyManager: IKeyManager,
    private readonly walletRepo: IWalletRepository
  ) {}

  async handle(command: walletCommand): Promise<IWalletRecord> {
    switch (command.type) {
      case "CREATE_WALLET":
        return this.keyManager.createWallet({
          ownerId: command.ownerId,
          chain: command.chain,
          assetCode: command.assetCode,
        })

      case "DERIVE_ADDRESS": {
        const baseWallet = await this.walletRepo.one({
          walletId: command.walletId,
        })
        if (!baseWallet) {
          throw new Error(
            `No se encontró wallet base ${command.walletId} para derivar`
          )
        }

        const derivable = this.keyManager
        if (typeof derivable.deriveAddress !== "function") {
          throw new Error(
            "KeyManager configurado no soporta deriveAddress (usa SealedMnemonicKeyManager)"
          )
        }

        return derivable.deriveAddress({
          wallet: baseWallet,
        } as IDeriveAddressInput)
      }

      default: {
        const exhaustive: never = command
        throw new Error(
          `Tipo de comando no soportado: ${(exhaustive as any).type}`
        )
      }
    }
  }
}

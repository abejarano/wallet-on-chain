import { WalletMessageHandler } from "@/application/wallet/WalletMessageHandler"
import { WithdrawalMessageHandler } from "@/application/withdrawal/WithdrawalMessageHandler"
import { MongoWalletRepository } from "@/infrastructure/presistence/MongoWalletRepository"
import { MongoSealedSecretRepository } from "@/infrastructure/presistence/MongoSealedSecretRepository"
import { MongoHdWalletIndexRepository } from "@/infrastructure/presistence/MongoHdWalletIndexRepository"
import { resolveKeyManager } from "@/infrastructure/key-managers/keyManagerFactory"
import { IMessageBroker, WalletCommandMessage, WithdrawalCommandMessage, } from "@/shared/messaging/interface"

/**
 * Punto de entrada sugerido: el subscriber del broker crea el consumer con sus
 * dependencias y delega el manejo de cada mensaje.
 */
export async function startWalletCommandSubscriber(params: {
  broker: IMessageBroker
}) {
  await params.broker.onWalletMessage(async (message: WalletCommandMessage) => {
    const walletRepo = MongoWalletRepository.instance()
    const sealedRepo = MongoSealedSecretRepository.instance()
    const hdIndexRepo = MongoHdWalletIndexRepository.instance()

    const keyManager = resolveKeyManager({
      walletRepo,
      sealedRepo,
      hdIndexRepo,
    })

    await new WalletMessageHandler(keyManager, walletRepo).handle(message)
  })
}

/**
 * Suscribe el broker a comandos de retiro usando una instancia de WithdrawalCommand
 * provista (ya configurada con WithdrawalService y adaptadores).
 */
export async function startWithdrawalCommandSubscriber(params: {
  broker: IMessageBroker
  withdrawalHandler: WithdrawalMessageHandler
}) {
  if (!params.broker.onWithdrawalMessage) {
    throw new Error("El broker no implementa onWithdrawalMessage")
  }

  await params.broker.onWithdrawalMessage(
    async (message: WithdrawalCommandMessage) => {
      await params.withdrawalHandler.handle(message)
    }
  )
}

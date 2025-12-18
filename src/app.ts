import { WalletCommand } from "@/application/wallet/WalletCommand"
import { WithdrawalCommand } from "@/application/withdrawal/WithdrawalCommand"
import { MongoWalletRepository } from "@/infrastructure/presistence/MongoWalletRepository"
import { MongoSealedSecretRepository } from "@/infrastructure/presistence/MongoSealedSecretRepository"
import { MongoHdWalletIndexRepository } from "@/infrastructure/presistence/MongoHdWalletIndexRepository"
import { resolveKeyManager } from "@/infrastructure/factories/keyManagerFactory"

/**
 * Tipo de mensaje esperado desde el broker para crear/derivar wallets.
 * Toma directamente el tipo que consume WalletCommand.handle.
 */
type WalletCommandMessage = Parameters<WalletCommand["handle"]>[0]
type WithdrawalCommandMessage = Parameters<WithdrawalCommand["handle"]>[0]

interface CommandBroker {
  /**
   * Registra el handler para mensajes entrantes del tópico/cola que uses
   * (SQS, Kafka, Redis, etc).
   */
  onWalletCommand(
    handler: (message: WalletCommandMessage) => Promise<void>
  ): Promise<void>

  /**
   * Handler para comandos de retiro.
   */
  onWithdrawalCommand?(
    handler: (message: WithdrawalCommandMessage) => Promise<void>
  ): Promise<void>
}

/**
 * Punto de entrada sugerido: el subscriber del broker crea el consumer con sus
 * dependencias y delega el manejo de cada mensaje.
 */
export async function startWalletCommandSubscriber(params: {
  broker: CommandBroker
}) {
  await params.broker.onWalletCommand(async (message) => {
    const walletRepo = MongoWalletRepository.instance()
    const sealedRepo = MongoSealedSecretRepository.instance()
    const hdIndexRepo = MongoHdWalletIndexRepository.instance()

    const keyManager = resolveKeyManager({
      walletRepo,
      sealedRepo,
      hdIndexRepo,
    })

    await new WalletCommand(keyManager, walletRepo).handle(message)
  })
}

/**
 * Suscribe el broker a comandos de retiro usando una instancia de WithdrawalCommand
 * provista (ya configurada con WithdrawalService y adaptadores).
 */
export async function startWithdrawalCommandSubscriber(params: {
  broker: CommandBroker
  withdrawalCommand: WithdrawalCommand
}) {
  if (!params.broker.onWithdrawalCommand) {
    throw new Error("El broker no implementa onWithdrawalCommand")
  }

  await params.broker.onWithdrawalCommand(async (message) => {
    await params.withdrawalCommand.handle(message)
  })
}

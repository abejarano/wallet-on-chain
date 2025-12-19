import type { WalletMessageHandler } from "@/application/wallet/WalletMessageHandler"
import type { WithdrawalMessageHandler } from "@/application/withdrawal/WithdrawalMessageHandler"

export type WalletCommandMessage = Parameters<
  WalletMessageHandler["handle"]
>[0]

export type WithdrawalCommandMessage = Parameters<
  WithdrawalMessageHandler["handle"]
>[0]

export type WalletMessageHandlerFn = (
  message: WalletCommandMessage
) => Promise<void>

export type WithdrawalMessageHandlerFn = (
  message: WithdrawalCommandMessage
) => Promise<void>

/**
 * Broker de comandos: suscribe handlers a los mensajes entrantes del sistema de colas.
 */
export interface IMessageBroker {
  onWalletMessage(handler: WalletMessageHandlerFn): Promise<void>
  onWithdrawalMessage?(
    handler: WithdrawalMessageHandlerFn
  ): Promise<void>
  publish<TMessage = unknown>(message: TMessage): Promise<void>
}

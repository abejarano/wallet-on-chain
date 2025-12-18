import { formatMinorUnits, amountToMinorUnits } from "@/domain/withdrawal/amounts"
import {
  BroadcastResult,
  IChainWithdrawalAdapter,
  ILedgerGateway,
  IWithdrawalEvent,
  IWithdrawalMessage,
  WithdrawalEventPublisher,
  WithdrawalContext,
} from "@/domain/withdrawal/interfaces"
import { WithdrawalStatus } from "@/domain/withdrawal/enums/WithdrawalStatus.enum"

type Logger = Pick<Console, "info" | "error" | "warn">

export class WithdrawalService {
  constructor(
    private readonly ledger: ILedgerGateway,
    private readonly publisher: WithdrawalEventPublisher,
    private readonly adapters: IChainWithdrawalAdapter[],
    private readonly logger: Logger = console
  ) {}

  async processWithdrawal(request: IWithdrawalMessage): Promise<void> {
    const adapter = this.adapters.find((a) => a.supports(request.asset))
    if (!adapter) {
      await this.publishFailure(request, "UNSUPPORTED_ASSET")
      return
    }

    const amountInMinorUnits = amountToMinorUnits(
      request.asset,
      request.amount
    )

    const available = await this.ledger.getAvailableBalance(
      request.clientId,
      request.asset
    )

    if (amountInMinorUnits > available) {
      await this.publishFailure(request, "INSUFFICIENT_BALANCE", available)
      return
    }

    await this.ledger.reserveFunds({
      clientId: request.clientId,
      asset: request.asset,
      amount: amountInMinorUnits,
      withdrawalId: request.withdrawalId,
    })

    try {
    const broadcast = await adapter.execute({
      request,
      amountInMinorUnits,
    } as WithdrawalContext)

      await this.ledger.markWithdrawalCompleted({
        clientId: request.clientId,
        asset: request.asset,
        amount: amountInMinorUnits,
        withdrawalId: request.withdrawalId,
        txid: broadcast.txid,
      })

      await this.publishSuccess(request, broadcast)
    } catch (err) {
      this.logger.error(
        `[withdrawal] Error procesando ${request.withdrawalId}: ${
          (err as Error).message
        }`
      )

      await this.ledger.releaseReservation({
        clientId: request.clientId,
        asset: request.asset,
        amount: amountInMinorUnits,
        withdrawalId: request.withdrawalId,
        reason: (err as Error).message,
      })

      await this.publishFailure(
        request,
        "BROADCAST_ERROR",
        available,
        (err as Error).message
      )
    }
  }

  private async publishSuccess(
    request: IWithdrawalMessage,
    result: BroadcastResult
  ) {
    const event: IWithdrawalEvent = {
      clientId: request.clientId,
      withdrawalId: request.withdrawalId,
      asset: request.asset,
      status: WithdrawalStatus.PROCESSED,
      amount: request.amount,
      toAddress: request.toAddress,
      txid: result.txid,
    }

    await this.publisher.publish(event)
  }

  private async publishFailure(
    request: IWithdrawalMessage,
    reason: string,
    availableBalance?: bigint,
    detail?: string
  ) {
    const event: IWithdrawalEvent = {
      clientId: request.clientId,
      withdrawalId: request.withdrawalId,
      asset: request.asset,
      status: WithdrawalStatus.FAILED,
      amount: request.amount,
      toAddress: request.toAddress,
      reason: detail ? `${reason}:${detail}` : reason,
      balanceAvailable: availableBalance
        ? formatMinorUnits(request.asset, availableBalance)
        : undefined,
    }

    await this.publisher.publish(event)
  }
}

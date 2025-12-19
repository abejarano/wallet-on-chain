import {
  startWalletCommandSubscriber,
  startWithdrawalCommandSubscriber,
} from "@/app"
import { WithdrawalMessageHandler } from "@/application/withdrawal/WithdrawalMessageHandler"
import { WithdrawalService } from "@/application/withdrawal/WithdrawalService"
import { MongoWalletRepository } from "@/infrastructure/presistence/MongoWalletRepository"
import { resolveCommandBroker } from "@/shared/messaging/brokerFactory"
import { resolveWithdrawalAdapters } from "@/infrastructure/withdrawals/providers/providerResolver"
import { LedgerHttpGateway } from "@/infrastructure/ledger/LedgerHttpGateway"
import { ENV } from "@/config/env"

async function main() {
  const broker = resolveCommandBroker()

  // Wallet commands subscriber
  await startWalletCommandSubscriber({ broker })

  // Withdrawal commands subscriber
  const walletRepo = MongoWalletRepository.instance()

  const ledger = new LedgerHttpGateway(
    ENV.LEDGER_API_URL || "",
    ENV.LEDGER_API_KEY || ""
  )

  const adapters = resolveWithdrawalAdapters()
  const withdrawalService = new WithdrawalService(
    ledger,
    broker,
    adapters
  )
  const withdrawalHandler = new WithdrawalMessageHandler(
    walletRepo,
    withdrawalService
  )

  await startWithdrawalCommandSubscriber({
    broker,
    withdrawalHandler,
  })
}

main().catch((err) => {
  console.error("Worker failed", err)
  process.exit(1)
})

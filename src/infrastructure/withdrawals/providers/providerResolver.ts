import { ProviderVendor, PROVIDER_VENDOR } from "@/config/provider.constants"
import { IChainWithdrawalAdapter } from "@/domain/withdrawal/interfaces"
import { TatumWithdrawalAdapter } from "@/infrastructure/withdrawals/providers/tatum/TatumWithdrawalAdapter"
import { CryptoApiWithdrawalAdapter } from "@/infrastructure/withdrawals/providers/cryptoapis/CryptoApiWithdrawalAdapter"
import { NodeRpcWithdrawalAdapter } from "@/infrastructure/withdrawals/providers/rpc/NodeRpcWithdrawalAdapter"

export function resolveWithdrawalAdapters(): IChainWithdrawalAdapter[] {
  switch (PROVIDER_VENDOR) {
    case ProviderVendor.TATUM:
      return [new TatumWithdrawalAdapter()]
    case ProviderVendor.CRYPTOAPI:
      return [new CryptoApiWithdrawalAdapter()]
    case ProviderVendor.NODE_RPC:
    default:
      return [new NodeRpcWithdrawalAdapter()]
  }
}

import { ENV } from "./env"

export enum ProviderVendor {
  TATUM = "TATUM",
  CRYPTOAPI = "CRYPTOAPI",
  NODE_RPC = "NODE_RPC",
}

export const PROVIDER_VENDOR: ProviderVendor =
  (ENV.PROVIDER_VENDOR as ProviderVendor | undefined) ?? ProviderVendor.NODE_RPC

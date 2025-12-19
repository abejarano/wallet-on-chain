export enum KeyManagerKind {
  KmsOnlyKeyManager = "KmsOnlyKeyManager",
  SealedMnemonicKeyManager = "SealedMnemonicKeyManager",
}

export enum CloudProvider {
  AWS = "AWS",
  GCP = "GCP",
}

import { ENV } from "./env"

export const PROVIDERS = {
  tatum: {
    apiKey: ENV.TATUM_API_KEY || "your-tatum-api-key",
    apiUrl: ENV.TATUM_API_URL || "https://api.tatum.io",
    active: (ENV.TATUM_ACTIVE ?? "yes") === "yes",
  },
  cryptoapis: {
    apiKey: ENV.CRYPTOAPIS_API_KEY || "your-cryptoapis-api-key",
    apiUrl: ENV.CRYPTOAPIS_API_URL || "https://api.cryptoapis.io",
    active: (ENV.CRYPTOAPIS_ACTIVE ?? "yes") === "yes",
  },
}

export const KEY_MANAGER: KeyManagerKind =
  (ENV.WALLET_KEY_MANAGER as KeyManagerKind | undefined) ||
  KeyManagerKind.SealedMnemonicKeyManager

export const CLOUD_PROVIDER: CloudProvider =
  (ENV.CLOUD_PROVIDER as CloudProvider | undefined) || CloudProvider.AWS

import { SealedMnemonicKeyManager } from "@/infrastructure/crypto/key-managers/SealedMnemonicKeyManager"
import { KmsOnlyKeyManager } from "@/infrastructure/crypto/key-managers/KmsOnlyKeyManager"

export enum KeyManagerKind {
  KmsOnlyKeyManager = "KmsOnlyKeyManager",
  SealedMnemonicKeyManager = "SealedMnemonicKeyManager",
}

export const PROVIDERS = {
  tatum: {
    apiKey: process.env.TATUM_API_KEY || "your-tatum-api-key",
    apiUrl: process.env.TATUM_API_URL || "https://api.tatum.io",
    active: process.env.TATUM_ACTIVE || "yes" === "yes",
  },
  cryptoapis: {
    apiKey: process.env.CRYPTOAPIS_API_KEY || "your-cryptoapis-api-key",
    apiUrl: process.env.CRYPTOAPIS_API_URL || "https://api.cryptoapis.io",
    active: process.env.TATUM_ACTIVE || "yes" === "yes",
  },
}

const KEY_MANAGER_KIND: KeyManagerKind =
  (process.env.WALLET_KEY_MANAGER as KeyManagerKind | undefined) ||
  KeyManagerKind.SealedMnemonicKeyManager

export const KEY_MANAGER = {
  kind: KEY_MANAGER_KIND,
}

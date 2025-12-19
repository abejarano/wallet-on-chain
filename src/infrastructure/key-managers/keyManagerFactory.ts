import { CLOUD_PROVIDER, CloudProvider, KEY_MANAGER, KeyManagerKind, } from "@/config/app.constants"
import {
  IHdWalletIndexRepository,
  IKeyManager,
  ISealedSecretRepository,
  IWalletRepository,
} from "@/domain/wallet/interface"
import { AwsKmsOnlyKeyManager } from "@/infrastructure/key-managers/aws/AwsKmsOnlyKeyManager"
import { AwsSealedMnemonicKeyManager } from "@/infrastructure/key-managers/aws/AwsSealedMnemonicKeyManager"
import { GcpKmsOnlyKeyManager } from "@/infrastructure/key-managers/gcp/GcpKmsOnlyKeyManager"
import { GcpSealedMnemonicKeyManager } from "@/infrastructure/key-managers/gcp/GcpSealedMnemonicKeyManager"

/**
 * Devuelve un IKeyManager listo según config.
 */
export function resolveKeyManager(params: {
  walletRepo: IWalletRepository
  sealedRepo: ISealedSecretRepository
  hdIndexRepo: IHdWalletIndexRepository
}): IKeyManager {
  if (CLOUD_PROVIDER === CloudProvider.GCP) {
    if (KEY_MANAGER === KeyManagerKind.KmsOnlyKeyManager) {
      return new GcpKmsOnlyKeyManager(params.walletRepo)
    }

    return new GcpSealedMnemonicKeyManager(
      params.walletRepo,
      params.sealedRepo,
      params.hdIndexRepo
    )
  }

  if (KEY_MANAGER === KeyManagerKind.KmsOnlyKeyManager) {
    return new AwsKmsOnlyKeyManager(params.walletRepo)
  }

  return new AwsSealedMnemonicKeyManager(
    params.walletRepo,
    params.sealedRepo,
    params.hdIndexRepo
  )
}

import {
  ICreateWalletInput,
  IKeyManager,
  ISignatureResult,
  ISignDigestInput,
  IWalletRecord,
  IWalletRepository,
} from "@/domain/wallet/interface"
import { GcpKmsClient } from "@/infrastructure/key-managers/gcp/GcpKmsClient"
import { GCP_KMS } from "@/config/gcpKms.constants"
import crypto from "node:crypto"
import {
  computeChainSignatureValues,
  deriveAddressDataFromSpki,
  derSignatureToRS,
} from "@/infrastructure/crypto/helpers"

/**
 * Key manager usando GCP KMS (EC secp256k1).
 */
export class GcpKmsOnlyKeyManager implements IKeyManager {
  private readonly kms = new GcpKmsClient()

  constructor(private readonly walletRepo: IWalletRepository) {}

  async createWallet(input: ICreateWalletInput): Promise<IWalletRecord> {
    const { ownerId, chain, assetCode } = input

    this.ensureConfig()

    const keyId = `wallet-${crypto.randomUUID()}`
    const { keyVersionName, publicKeyPem } =
      await this.kms.createAsymmetricSignKey({
        projectId: GCP_KMS.projectId,
        location: GCP_KMS.location,
        keyRing: GCP_KMS.keyRing,
        protectionLevel: GCP_KMS.protectionLevel,
        keyId,
      })

    const spkiDer = this.pemToDer(publicKeyPem)
    const derived = deriveAddressDataFromSpki(chain, spkiDer)

    const wallet: IWalletRecord = {
      walletId: crypto.randomUUID(),
      ownerId,
      chain,
      assetCode,
      address: derived.address,
      kmsKeyId: keyVersionName,
      publicKeyHex: derived.uncompressedPublicKey.toString("hex"),
    }

    return this.walletRepo.save(wallet)
  }

  async signDigest(input: ISignDigestInput): Promise<ISignatureResult> {
    const { wallet, digest } = input
    if (!wallet.kmsKeyId) {
      throw new Error(`Wallet ${wallet.walletId} no tiene kmsKeyId`)
    }

    const derSig = await this.kms.signDigest({
      keyVersionName: wallet.kmsKeyId,
      digest,
    })

    const { r, s } = derSignatureToRS(derSig)
    const extras = computeChainSignatureValues({
      chain: wallet.chain,
      digest,
      r,
      s,
      publicKeyHex: wallet.publicKeyHex,
    })

    return {
      r,
      s,
      ...extras,
      compactHex: "0x" + Buffer.concat([r, s]).toString("hex"),
    }
  }

  private ensureConfig() {
    if (!GCP_KMS.projectId || !GCP_KMS.keyRing) {
      throw new Error("Faltan GCP KMS envs: GCP_PROJECT o GCP_KMS_KEY_RING")
    }
  }

  private pemToDer(pem: string): Uint8Array {
    const lines = pem
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\s+/g, "")
    return Buffer.from(lines, "base64")
  }
}

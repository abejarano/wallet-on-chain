import {
  CreateKeyCommand,
  GetPublicKeyCommand,
  MessageType,
  SignCommand,
  SigningAlgorithmSpec,
} from "@aws-sdk/client-kms"
import crypto from "node:crypto"

import {
  ICreateWalletInput,
  IKeyManager,
  ISignatureResult,
  ISignDigestInput,
  IWalletRecord,
  IWalletRepository,
} from "@/domain/wallet/interface"
import { awsKmsClient } from "@/infrastructure/key-managers/aws/AwsKmsClient"
import {
  computeChainSignatureValues,
  deriveAddressDataFromSpki,
  derSignatureToRS,
} from "@/infrastructure/crypto/helpers"

/**
 * Key manager AWS KMS (secp256k1). No soporta derivación HD.
 */
export class AwsKmsOnlyKeyManager implements IKeyManager {
  constructor(private walletRepo: IWalletRepository) {}

  async createWallet(input: ICreateWalletInput): Promise<IWalletRecord> {
    const { ownerId, chain, assetCode } = input

    // 1) Crear llave asimétrica en KMS
    const createKeyResp = await awsKmsClient.send(
      new CreateKeyCommand({
        KeySpec: "ECC_SECG_P256K1",
        KeyUsage: "SIGN_VERIFY",
        Description: `Epic wallet for ${ownerId} ${assetCode}`,
        Origin: "AWS_KMS",
        MultiRegion: false,
        Tags: [
          { TagKey: "ownerId", TagValue: ownerId },
          { TagKey: "asset", TagValue: assetCode },
          { TagKey: "type", TagValue: "wallet" },
        ],
      })
    )

    const kmsKeyId = createKeyResp.KeyMetadata?.KeyId
    if (!kmsKeyId) throw new Error("KMS CreateKey failed: no KeyId")

    // 2) Obtener public key cruda (SPKI DER)
    const pubResp = await awsKmsClient.send(
      new GetPublicKeyCommand({
        KeyId: kmsKeyId,
      })
    )

    if (!pubResp.PublicKey) throw new Error("KMS GetPublicKey failed")

    const spki = new Uint8Array(pubResp.PublicKey)

    // 3) Derivar address + metadata según chain
    const derived = deriveAddressDataFromSpki(chain, spki)

    // 4) Construir y guardar WalletRecord
    const wallet: IWalletRecord = {
      walletId: crypto.randomUUID(),
      ownerId,
      chain,
      assetCode,
      address: derived.address,
      kmsKeyId,
      publicKeyHex: derived.uncompressedPublicKey.toString("hex"),
    }

    return this.walletRepo.save(wallet)
  }

  async signDigest(input: ISignDigestInput): Promise<ISignatureResult> {
    const { wallet, digest } = input
    if (!wallet.kmsKeyId) {
      throw new Error(`Wallet ${wallet.walletId} has no kmsKeyId`)
    }

    const signResp = await awsKmsClient.send(
      new SignCommand({
        KeyId: wallet.kmsKeyId,
        Message: digest,
        MessageType: MessageType.DIGEST,
        SigningAlgorithm: SigningAlgorithmSpec.ECDSA_SHA_256,
      })
    )

    if (!signResp.Signature) {
      throw new Error("KMS Sign failed: no signature")
    }

    const der = Buffer.from(signResp.Signature)
    const { r, s } = derSignatureToRS(der)
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
}

import {
  DecryptCommand,
  GenerateDataKeyCommand,
  KMSClient,
} from "@aws-sdk/client-kms"
import * as bip39 from "bip39"
import BIP32Factory, { BIP32Interface } from "bip32"
import * as ecc from "tiny-secp256k1"
import * as secp from "@noble/secp256k1"
import crypto from "node:crypto"

import {
  Chain,
  ICreateWalletInput,
  IDeriveAddressInput,
  IHdWalletIndexRepository,
  IKeyManager,
  ISealedSecret,
  ISealedSecretRepository,
  ISignatureResult,
  ISignDigestInput,
  IWalletRecord,
  IWalletRepository,
} from "@/domain/wallet/interface"

import {
  chainAddressDerivers,
  computeChainSignatureValues,
} from "@/infrastructure/crypto/helpers"
import {
  AWS_KMS_KEY_ID,
  COIN_TYPE,
} from "@/infrastructure/crypto/config/Config"
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
} from "@/infrastructure/crypto/encryption/aes"
import { ENV } from "@/config/env"

const bip32 = BIP32Factory(ecc as any)

type EncContext = Record<string, string>

export class AwsSealedMnemonicKeyManager implements IKeyManager {
  private awsKmsClient: KMSClient

  constructor(
    private readonly walletRepo: IWalletRepository,
    private readonly sealedRepo: ISealedSecretRepository,
    private readonly hdIndexRepo: IHdWalletIndexRepository
  ) {
    this.awsKmsClient = new KMSClient({
      region: ENV.AWS_REGION || "us-east-1",
    })
  }

  private get kmsKeyId(): string {
    const id = AWS_KMS_KEY_ID
    if (!id) {
      throw new Error("AWS_KMS_KEY_ID no está configurado")
    }
    return id
  }

  async createWallet(input: ICreateWalletInput): Promise<IWalletRecord> {
    const { ownerId, chain, assetCode } = input
    this.ensureChainSupported(chain)

    const mnemonic = bip39.generateMnemonic(256)
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const sealed = await this.sealMnemonic(ownerId, mnemonic)
    const nextIndex = await this.hdIndexRepo.reserveNextIndex(sealed.id)
    const derivationPath = this.buildDerivationPath(chain, nextIndex)
    const derived = this.deriveFromSeed(seed, chain, derivationPath)

    return await this.persistWallet({
      ownerId,
      chain,
      assetCode,
      address: derived.address,
      derivationPath,
      sealedSecretId: sealed.id,
      publicKeyHex: derived.publicKey.toString("hex"),
    })
  }

  async deriveAddress(input: IDeriveAddressInput): Promise<IWalletRecord> {
    const { wallet } = input
    if (!wallet.sealedSecretId) {
      throw new Error(
        `Wallet ${wallet.walletId} no tiene sealedSecretId para derivar`
      )
    }

    const sealed = await this.sealedRepo.findById(wallet.sealedSecretId)
    if (!sealed) {
      throw new Error(`Sealed secret ${wallet.sealedSecretId} no encontrado`)
    }

    const targetIndex = await this.hdIndexRepo.reserveNextIndex(sealed.id)

    const mnemonic = await this.unsealMnemonic(sealed)
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const derivationPath = this.buildDerivationPath(wallet.chain, targetIndex)
    const derived = this.deriveFromSeed(seed, wallet.chain, derivationPath)

    return this.persistWallet({
      ownerId: wallet.ownerId,
      chain: wallet.chain,
      assetCode: wallet.assetCode,
      address: derived.address,
      derivationPath,
      sealedSecretId: sealed.id,
      publicKeyHex: derived.publicKey.toString("hex"),
    })
  }

  async signDigest(input: ISignDigestInput): Promise<ISignatureResult> {
    const { wallet, digest } = input

    if (!wallet.sealedSecretId || !wallet.derivationPath) {
      throw new Error(
        `Wallet ${wallet.walletId} carece de sealedSecretId/derivationPath`
      )
    }

    const sealed = await this.sealedRepo.findById(wallet.sealedSecretId)
    if (!sealed) {
      throw new Error(`Sealed secret ${wallet.sealedSecretId} no encontrado`)
    }

    const mnemonic = await this.unsealMnemonic(sealed)
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const child = this.deriveChildFromSeed(seed, wallet.derivationPath)

    if (!child.privateKey) {
      throw new Error("No se pudo derivar la private key para firmar")
    }

    const sig = secp.sign(new Uint8Array(digest), child.privateKey, {
      prehash: false,
    })

    if (sig.length !== 64) {
      throw new Error("Firma inesperada, longitud != 64 bytes")
    }

    const r = Buffer.from(sig.slice(0, 32))
    const s = Buffer.from(sig.slice(32))
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
      compactHex: "0x" + Buffer.from(sig).toString("hex"),
    }
  }

  private ensureChainSupported(chain: Chain) {
    if (!(chain in COIN_TYPE)) {
      throw new Error(
        `Chain no soportada en SealedMnemonicKeyManager: ${chain}`
      )
    }
  }

  private buildDerivationPath(chain: Chain, index: number): string {
    const coinType = COIN_TYPE[chain]
    return `m/44'/${coinType}'/0'/0/${index}`
  }

  private deriveFromSeed(
    seed: Buffer,
    chain: Chain,
    derivationPath: string
  ): { publicKey: Buffer; address: string } {
    const child = this.deriveChildFromSeed(seed, derivationPath)
    if (!child.privateKey) {
      throw new Error("No se pudo derivar la llave privada")
    }

    const pubKey = Buffer.from(secp.getPublicKey(child.privateKey, false))
    const address = chainAddressDerivers[chain](pubKey)

    return { publicKey: pubKey, address }
  }

  private deriveChildFromSeed(
    seed: Buffer,
    derivationPath: string
  ): BIP32Interface {
    const root = bip32.fromSeed(seed)
    return root.derivePath(derivationPath)
  }

  private async persistWallet(params: {
    ownerId: string
    chain: Chain
    assetCode: string
    address: string
    derivationPath: string
    sealedSecretId: string
    publicKeyHex: string
  }): Promise<IWalletRecord> {
    const walletRecord: IWalletRecord = {
      walletId: crypto.randomUUID(),
      ownerId: params.ownerId,
      chain: params.chain,
      assetCode: params.assetCode,
      address: params.address,
      sealedSecretId: params.sealedSecretId,
      derivationPath: params.derivationPath,
      publicKeyHex: params.publicKeyHex,
    }

    return this.walletRepo.save(walletRecord)
  }

  private async sealMnemonic(
    ownerId: string,
    mnemonic: string
  ): Promise<ISealedSecret> {
    const encContext = this.buildEncContext(ownerId)

    const dataKey = await this.awsKmsClient.send(
      new GenerateDataKeyCommand({
        KeyId: this.kmsKeyId,
        KeySpec: "AES_256",
        EncryptionContext: encContext,
      })
    )

    if (!dataKey.Plaintext || !dataKey.CiphertextBlob) {
      throw new Error("KMS GenerateDataKey no devolvió plaintext/ciphertext")
    }

    const plain = Buffer.from(dataKey.Plaintext)
    const cipher = Buffer.from(dataKey.CiphertextBlob)
    const { iv, ciphertext, authTag } = aesGcmEncrypt(
      plain,
      Buffer.from(mnemonic, "utf8")
    )

    const sealed: ISealedSecret = {
      id: crypto.randomUUID(),
      ownerId,
      encContext,
      dataKeyCipherB64: cipher.toString("base64"),
      ivB64: iv.toString("base64"),
      authTagB64: authTag.toString("base64"),
      secretCipherB64: ciphertext.toString("base64"),
      createdAt: new Date(),
    }

    return this.sealedRepo.save(sealed)
  }

  private async unsealMnemonic(sealed: ISealedSecret): Promise<string> {
    const decryptResp = await this.awsKmsClient.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(sealed.dataKeyCipherB64, "base64"),
        EncryptionContext: sealed.encContext,
      })
    )

    if (!decryptResp.Plaintext) {
      throw new Error("KMS Decrypt no devolvió plaintext")
    }

    const dataKey = Buffer.from(decryptResp.Plaintext)
    const mnemonicBuf = aesGcmDecrypt(
      dataKey,
      Buffer.from(sealed.ivB64, "base64"),
      Buffer.from(sealed.authTagB64, "base64"),
      Buffer.from(sealed.secretCipherB64, "base64")
    )

    return mnemonicBuf.toString("utf8")
  }

  private buildEncContext(ownerId: string): EncContext {
    return {
      ownerId,
      env: ENV.NODE_ENV || "dev",
    }
  }
}

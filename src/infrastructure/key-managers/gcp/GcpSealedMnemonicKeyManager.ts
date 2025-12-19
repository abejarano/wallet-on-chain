import {
  ICreateWalletInput,
  IDeriveAddressInput,
  IHdWalletIndexRepository as HdRepo,
  IKeyManager,
  ISealedSecret,
  ISealedSecretRepository as SealedRepo,
  ISignatureResult,
  ISignDigestInput,
  IWalletRecord,
  IWalletRepository,
} from "@/domain/wallet/interface"
import { GcpKmsClient } from "@/infrastructure/key-managers/gcp/GcpKmsClient"
import { GCP_KMS } from "@/config/gcpKms.constants"
import * as bip39 from "bip39"
import BIP32Factory, { BIP32Interface } from "bip32"
import * as ecc from "tiny-secp256k1"
import * as secp from "@noble/secp256k1"
import crypto from "node:crypto"
import {
  chainAddressDerivers,
  computeChainSignatureValues,
} from "@/infrastructure/crypto/helpers"
import { COIN_TYPE } from "@/infrastructure/crypto/config/Config"
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
} from "@/infrastructure/crypto/encryption/aes"
import { ENV } from "@/config/env"

const bip32 = BIP32Factory(ecc as any)

export class GcpSealedMnemonicKeyManager implements IKeyManager {
  private readonly kms = new GcpKmsClient()

  constructor(
    private readonly walletRepo: IWalletRepository,
    private readonly sealedRepo: SealedRepo,
    private readonly hdIndexRepo: HdRepo
  ) {}

  async createWallet(input: ICreateWalletInput): Promise<IWalletRecord> {
    this.ensureChainSupported(input.chain)
    const mnemonic = bip39.generateMnemonic(256)
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const sealed = await this.sealMnemonic(input.ownerId, mnemonic)
    const nextIndex = await this.hdIndexRepo.reserveNextIndex(sealed.id)
    const derivationPath = this.buildDerivationPath(input.chain, nextIndex)
    const derived = this.deriveFromSeed(seed, input.chain, derivationPath)

    return this.persistWallet({
      ownerId: input.ownerId,
      chain: input.chain,
      assetCode: input.assetCode,
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

  private ensureChainSupported(chain: string) {
    if (!(chain in COIN_TYPE)) {
      throw new Error(
        `Chain no soportada en GcpSealedMnemonicKeyManager: ${chain}`
      )
    }
  }

  private buildDerivationPath(chain: string, index: number): string {
    const coinType = COIN_TYPE[chain]
    return `m/44'/${coinType}'/0'/0/${index}`
  }

  private deriveFromSeed(
    seed: Buffer,
    chain: string,
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
    chain: string
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
    const dataKey = crypto.randomBytes(32)
    const encContext = this.buildEncContext(ownerId)

    if (!GCP_KMS.dataKeyName) {
      throw new Error("GCP_KMS_DATA_KEY no configurado")
    }

    const ciphertext = await this.kms.encrypt({
      keyName: GCP_KMS.dataKeyName,
      plaintext: dataKey,
    })

    const {
      iv,
      ciphertext: secretCipher,
      authTag,
    } = aesGcmEncrypt(dataKey, Buffer.from(mnemonic, "utf8"))

    const sealed: ISealedSecret = {
      id: crypto.randomUUID(),
      ownerId,
      encContext,
      dataKeyCipherB64: ciphertext.toString("base64"),
      ivB64: iv.toString("base64"),
      authTagB64: authTag.toString("base64"),
      secretCipherB64: secretCipher.toString("base64"),
      createdAt: new Date(),
    }

    return this.sealedRepo.save(sealed)
  }

  private async unsealMnemonic(sealed: ISealedSecret): Promise<string> {
    if (!GCP_KMS.dataKeyName) {
      throw new Error("GCP_KMS_DATA_KEY no configurado")
    }

    const dataKey = await this.kms.decrypt({
      keyName: GCP_KMS.dataKeyName,
      ciphertext: Buffer.from(sealed.dataKeyCipherB64, "base64"),
    })

    const mnemonicBuf = aesGcmDecrypt(
      dataKey,
      Buffer.from(sealed.ivB64, "base64"),
      Buffer.from(sealed.authTagB64, "base64"),
      Buffer.from(sealed.secretCipherB64, "base64")
    )

    return mnemonicBuf.toString("utf8")
  }

  private buildEncContext(ownerId: string): Record<string, string> {
    return {
      ownerId,
      env: ENV.NODE_ENV || "dev",
    }
  }
}

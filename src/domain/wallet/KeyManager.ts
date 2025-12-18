/**
 * Identificador de red. Se deja abierto para soportar múltiples chains
 * (BTC/ETH/TRX u otras que añadas en Config).
 */
export type Chain = string

export interface ICreateWalletInput {
  ownerId: string // ej: clientId:assetCode
  chain: Chain
  assetCode: string // "BTC", "ETH", "USDT-TRX", etc.
}

export interface IWalletRecord {
  walletId: string
  ownerId: string
  chain: Chain
  assetCode: string
  address: string
  /**
   * Clave pública sin comprimir en hex (opcional, útil para recuperar v/recovery).
   */
  publicKeyHex?: string

  // KMS-only
  kmsKeyId?: string

  // Sealed mnemonic
  sealedSecretId?: string
  derivationPath?: string
}

export interface ISignDigestInput {
  wallet: IWalletRecord
  digest: Buffer // hash ya calculado (sighash, RLP hash, etc.)
}

export interface IDeriveAddressInput {
  wallet: IWalletRecord
}

export interface ISignatureResult {
  r: Buffer
  s: Buffer
  // Opcional para ETH
  v?: number
  // Paridad de recuperación (0 o 1) para ECDSA
  recovery?: number
  // hex completo si quieres
  compactHex?: string
}

export interface IKeyManager {
  createWallet(input: ICreateWalletInput): Promise<IWalletRecord>
  signDigest(input: ISignDigestInput): Promise<ISignatureResult>
  deriveAddress?: (input: IDeriveAddressInput) => Promise<IWalletRecord>
}

export interface IWalletRepository {
  save(wallet: IWalletRecord): Promise<IWalletRecord>

  one(filter: object): Promise<IWalletRecord | null>
}

import { KeyManagementServiceClient } from "@google-cloud/kms"
import crypto from "node:crypto"

type CreateKeyParams = {
  projectId: string
  location: string
  keyRing: string
  protectionLevel?: "SOFTWARE" | "HSM"
  keyId?: string
}

type SignParams = { keyVersionName: string; digest: Buffer }

/**
 * Cliente GCP KMS: crea llaves EC secp256k1, firma digests y cifra/descifra.
 */
export class GcpKmsClient {
  private readonly client = new KeyManagementServiceClient()

  async createAsymmetricSignKey(
    params: CreateKeyParams
  ): Promise<{ keyVersionName: string; publicKeyPem: string }> {
    const keyRingName = this.client.keyRingPath(
      params.projectId,
      params.location,
      params.keyRing
    )

    await this.ensureKeyRing(keyRingName)

    const keyId = params.keyId ?? `wallet-${crypto.randomUUID()}`
    const [cryptoKey] = await this.client.createCryptoKey({
      parent: keyRingName,
      cryptoKeyId: keyId,
      cryptoKey: {
        purpose: "ASYMMETRIC_SIGN",
        versionTemplate: {
          algorithm: "EC_SIGN_SECP256K1_SHA256",
          protectionLevel: params.protectionLevel || "HSM",
        },
      },
      skipInitialVersionCreation: false,
    })

    const keyVersionName =
      cryptoKey.primary?.name ??
      `${cryptoKey.name}/cryptoKeyVersions/1`

    const publicKeyPem = await this.getPublicKey(keyVersionName)
    return { keyVersionName, publicKeyPem }
  }

  async encrypt(params: EncryptParams): Promise<Buffer> {
    const [resp] = await this.client.encrypt({
      name: params.keyName,
      plaintext: params.plaintext,
      additionalAuthenticatedData: params.aad,
    })
    if (!resp.ciphertext) {
      throw new Error("GCP KMS encrypt devolvió ciphertext vacío")
    }
    return Buffer.from(resp.ciphertext as Uint8Array)
  }

  async decrypt(params: DecryptParams): Promise<Buffer> {
    const [resp] = await this.client.decrypt({
      name: params.keyName,
      ciphertext: params.ciphertext,
      additionalAuthenticatedData: params.aad,
    })
    if (!resp.plaintext) {
      throw new Error("GCP KMS decrypt devolvió plaintext vacío")
    }
    return Buffer.from(resp.plaintext as Uint8Array)
  }

  async signDigest(params: SignParams): Promise<Buffer> {
    const [resp] = await this.client.asymmetricSign({
      name: params.keyVersionName,
      digest: { sha256: params.digest },
    })
    if (!resp.signature) {
      throw new Error("GCP KMS sign devolvió signature vacío")
    }
    return Buffer.from(resp.signature)
  }

  async getPublicKey(keyVersionName: string): Promise<string> {
    const [resp] = await this.client.getPublicKey({ name: keyVersionName })
    if (!resp.pem) {
      throw new Error("GCP KMS getPublicKey sin pem")
    }
    return resp.pem
  }

  private async ensureKeyRing(keyRingName: string): Promise<void> {
    const [exists] = await this.client.getKeyRing({ name: keyRingName }).catch(
      (err: any) => {
        if (err.code === 5) return [null] // NOT_FOUND
        throw err
      }
    )
    if (exists) return

    const match = /projects\/([^/]+)\/locations\/([^/]+)\/keyRings\/(.+)/.exec(
      keyRingName
    )
    if (!match) {
      throw new Error(`Nombre de keyRing inválido: ${keyRingName}`)
    }
    const [, projectId, locationId, keyRingId] = match
    await this.client.createKeyRing({
      parent: this.client.locationPath(projectId, locationId),
      keyRingId,
      keyRing: {},
    })
  }
}
type EncryptParams = {
  keyName: string
  plaintext: Buffer
  aad?: Buffer
}

type DecryptParams = {
  keyName: string
  ciphertext: Buffer
  aad?: Buffer
}

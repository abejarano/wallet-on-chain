export interface ISealedSecret {
  id: string
  ownerId: string
  encContext: Record<string, string>
  dataKeyCipherB64: string
  ivB64: string
  authTagB64: string
  secretCipherB64: string
  createdAt: Date
}

export interface ISealedSecretRepository {
  save(secret: ISealedSecret): Promise<ISealedSecret>
  findById(id: string): Promise<ISealedSecret | null>
}

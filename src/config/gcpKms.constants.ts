import { ENV } from "./env"

export const GCP_KMS = {
  projectId: ENV.GCP_PROJECT || "",
  location: ENV.GCP_KMS_LOCATION || "global",
  keyRing: ENV.GCP_KMS_KEY_RING || "wallet-keyring",
  protectionLevel: (ENV.GCP_KMS_PROTECTION_LEVEL ||
    "HSM") as "SOFTWARE" | "HSM",
  dataKeyName: ENV.GCP_KMS_DATA_KEY || "",
}

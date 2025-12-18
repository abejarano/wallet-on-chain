import { KMSClient } from "@aws-sdk/client-kms"

export const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || "us-east-1",
})

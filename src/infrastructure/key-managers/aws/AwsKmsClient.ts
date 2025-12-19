import { KMSClient } from "@aws-sdk/client-kms"
import { ENV } from "@/config/env"

export const awsKmsClient = new KMSClient({
  region: ENV.AWS_REGION || "us-east-1",
})

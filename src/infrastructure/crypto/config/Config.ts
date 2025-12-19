export const COIN_TYPE: Record<string, number> = {
  BTC: 0,
  ETH: 60,
  TRX: 195,
}

import { ENV } from "@/config/env"

export const AWS_KMS_KEY_ID = ENV.AWS_KMS_KEY_ID || ""

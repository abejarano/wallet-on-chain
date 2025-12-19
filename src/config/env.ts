/**
 * Variables de entorno centralizadas. No hagas `process.env` fuera de aquí.
 */
export const ENV = {
  WALLET_KEY_MANAGER: process.env.WALLET_KEY_MANAGER,
  CLOUD_PROVIDER: process.env.CLOUD_PROVIDER,

  // Proveedores externos
  TATUM_API_KEY: process.env.TATUM_API_KEY,
  TATUM_API_URL: process.env.TATUM_API_URL,
  TATUM_ACTIVE: process.env.TATUM_ACTIVE,

  CRYPTOAPIS_API_KEY: process.env.CRYPTOAPIS_API_KEY,
  CRYPTOAPIS_API_URL: process.env.CRYPTOAPIS_API_URL,
  CRYPTOAPIS_ACTIVE: process.env.CRYPTOAPIS_ACTIVE,

  PROVIDER_VENDOR: process.env.PROVIDER_VENDOR,

  // Mensajería
  SQS_WALLET_QUEUE_URL: process.env.SQS_WALLET_QUEUE_URL,
  SQS_WITHDRAWAL_QUEUE_URL: process.env.SQS_WITHDRAWAL_QUEUE_URL,
  AWS_REGION: process.env.AWS_REGION,

  PUBSUB_WALLET_SUB: process.env.PUBSUB_WALLET_SUB,
  PUBSUB_WITHDRAWAL_SUB: process.env.PUBSUB_WITHDRAWAL_SUB,
  PUBSUB_EVENTS_SUB: process.env.PUBSUB_EVENTS_SUB,
  GCP_PROJECT: process.env.GCP_PROJECT,

  // Ledger / misc
  LEDGER_API_URL: process.env.LEDGER_API_URL,
  LEDGER_API_KEY: process.env.LEDGER_API_KEY,
  NODE_ENV: process.env.NODE_ENV,

  // KMS / crypto
  AWS_KMS_KEY_ID: process.env.AWS_KMS_KEY_ID,
  GCP_KMS_DATA_KEY: process.env.GCP_KMS_DATA_KEY,
  GCP_KMS_LOCATION: process.env.GCP_KMS_LOCATION,
  GCP_KMS_KEY_RING: process.env.GCP_KMS_KEY_RING,
  GCP_KMS_PROTECTION_LEVEL: process.env.GCP_KMS_PROTECTION_LEVEL,

  // Broker channels (mismos nombres en cualquier nube)
  BROKER_WALLET_TOPIC: process.env.BROKER_WALLET_TOPIC,
  BROKER_WITHDRAWAL_TOPIC: process.env.BROKER_WITHDRAWAL_TOPIC,
  BROKER_EVENTS_TOPIC: process.env.BROKER_EVENTS_TOPIC,

  // SQS overrides
  SQS_WALLET_QUEUE_NAME: process.env.SQS_WALLET_QUEUE_NAME,
  SQS_WITHDRAWAL_QUEUE_NAME: process.env.SQS_WITHDRAWAL_QUEUE_NAME,
  SQS_EVENTS_QUEUE_NAME: process.env.SQS_EVENTS_QUEUE_NAME,
  SQS_EVENTS_QUEUE_URL: process.env.SQS_EVENTS_QUEUE_URL,
}

import { ENV } from "./env"

export const BROKER_TOPICS = {
  wallet: ENV.BROKER_WALLET_TOPIC || "wallet-commands",
  withdrawal: ENV.BROKER_WITHDRAWAL_TOPIC || "withdrawal-commands",
  events: ENV.BROKER_EVENTS_TOPIC || "withdrawal-events",
}

export const SQS_CONFIG = {
  region: ENV.AWS_REGION,
  walletQueueUrl: ENV.SQS_WALLET_QUEUE_URL || "",
  withdrawalQueueUrl: ENV.SQS_WITHDRAWAL_QUEUE_URL || "",
  eventQueueUrl: ENV.SQS_EVENTS_QUEUE_URL || "",
  walletQueueName: ENV.SQS_WALLET_QUEUE_NAME || BROKER_TOPICS.wallet,
  withdrawalQueueName: ENV.SQS_WITHDRAWAL_QUEUE_NAME || BROKER_TOPICS.withdrawal,
  eventQueueName: ENV.SQS_EVENTS_QUEUE_NAME || BROKER_TOPICS.events,
}

export const PUBSUB_CONFIG = {
  projectId: ENV.GCP_PROJECT,
  walletTopic: BROKER_TOPICS.wallet,
  withdrawalTopic: BROKER_TOPICS.withdrawal,
  eventTopic: BROKER_TOPICS.events,
  walletSubscription: ENV.PUBSUB_WALLET_SUB || `${BROKER_TOPICS.wallet}-sub`,
  withdrawalSubscription:
    ENV.PUBSUB_WITHDRAWAL_SUB || `${BROKER_TOPICS.withdrawal}-sub`,
  eventSubscription: ENV.PUBSUB_EVENTS_SUB || `${BROKER_TOPICS.events}-sub`,
}

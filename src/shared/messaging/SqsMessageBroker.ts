import { SQS_CONFIG } from "@/config/messaging.constants"
import {
  IMessageBroker,
  WalletMessageHandlerFn,
  WithdrawalMessageHandlerFn,
} from "@/shared/messaging/interface"
import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs"

type SqsBrokerConfig = {
  region?: string
  walletQueueUrl?: string
  withdrawalQueueUrl?: string
  eventQueueUrl?: string
  walletQueueName: string
  withdrawalQueueName: string
  eventQueueName: string
}

/**
 * Broker SQS: resuelve colas por nombre (o URL) y expone handlers/publish.
 */
export class SqsMessageBroker implements IMessageBroker {
  private readonly client: SQSClient
  private walletQueueUrl!: string
  private withdrawalQueueUrl!: string
  private eventQueueUrl!: string
  private readonly initPromise: Promise<void>

  constructor() {
    const config: SqsBrokerConfig = {
      region: SQS_CONFIG.region,
      walletQueueUrl: SQS_CONFIG.walletQueueUrl || undefined,
      withdrawalQueueUrl: SQS_CONFIG.withdrawalQueueUrl || undefined,
      eventQueueUrl: SQS_CONFIG.eventQueueUrl || undefined,
      walletQueueName: SQS_CONFIG.walletQueueName,
      withdrawalQueueName: SQS_CONFIG.withdrawalQueueName,
      eventQueueName: SQS_CONFIG.eventQueueName,
    }

    this.client = new SQSClient({
      region: config.region || "us-east-1",
    })
    this.initPromise = this.resolveQueues(config)
  }

  async onWalletMessage(handler: WalletMessageHandlerFn): Promise<void> {
    await this.initPromise
    void this.pollQueue(this.walletQueueUrl, handler)
  }

  async onWithdrawalMessage(
    handler: WithdrawalMessageHandlerFn
  ): Promise<void> {
    await this.initPromise
    void this.pollQueue(this.withdrawalQueueUrl, handler)
  }

  async publish<TMessage = unknown>(message: TMessage): Promise<void> {
    await this.initPromise
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.eventQueueUrl,
        MessageBody: JSON.stringify(message),
      })
    )
  }

  private async resolveQueues(config: SqsBrokerConfig): Promise<void> {
    this.walletQueueUrl =
      config.walletQueueUrl ||
      (await this.lookupQueueUrl(config.walletQueueName))
    this.withdrawalQueueUrl =
      config.withdrawalQueueUrl ||
      (await this.lookupQueueUrl(config.withdrawalQueueName))
    this.eventQueueUrl =
      config.eventQueueUrl ||
      (await this.lookupQueueUrl(config.eventQueueName))
  }

  private async lookupQueueUrl(queueName: string): Promise<string> {
    const resp = await this.client.send(
      new GetQueueUrlCommand({ QueueName: queueName })
    )
    if (!resp.QueueUrl) {
      throw new Error(`No se encontró la cola SQS ${queueName}`)
    }
    return resp.QueueUrl
  }

  private async pollQueue(
    queueUrl: string,
    handler: WalletMessageHandlerFn | WithdrawalMessageHandlerFn
  ): Promise<void> {
    const receiveParams = {
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 10,
      VisibilityTimeout: 30,
    }

    const loop = async (): Promise<void> => {
      try {
        const resp = await this.client.send(
          new ReceiveMessageCommand(receiveParams)
        )
        const messages = resp.Messages || []
        await Promise.all(
          messages.map(async (msg) => {
            if (!msg.Body || !msg.ReceiptHandle) return
            try {
              const parsed = JSON.parse(msg.Body)
              await handler(parsed)
              await this.client.send(
                new DeleteMessageCommand({
                  QueueUrl: queueUrl,
                  ReceiptHandle: msg.ReceiptHandle,
                })
              )
            } catch (err) {
              console.error("SQS handler error", err)
              // si falla, no borramos el mensaje para que reintente
            }
          })
        )
      } catch (err) {
        console.error("SQS poll error", err)
      } finally {
        setImmediate(loop)
      }
    }

    void loop()
  }
}

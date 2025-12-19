import { PUBSUB_CONFIG } from "@/config/messaging.constants"
import {
  IMessageBroker,
  WalletMessageHandlerFn,
  WithdrawalMessageHandlerFn,
} from "@/shared/messaging/interface"
import { PubSub, Subscription, Topic } from "@google-cloud/pubsub"

type PubSubBrokerConfig = {
  projectId?: string
  walletTopic: string
  withdrawalTopic: string
  eventTopic: string
  walletSubscription: string
  withdrawalSubscription: string
  eventSubscription: string
}

/**
 * Broker Pub/Sub: crea/usa topics y suscripciones declarados en config.
 */
export class PubSubMessageBroker implements IMessageBroker {
  private readonly client: PubSub
  private readonly config: PubSubBrokerConfig
  private walletSubscription!: Subscription
  private withdrawalSubscription!: Subscription
  private eventTopic!: Topic
  private readonly initPromise: Promise<void>

  constructor() {
    this.config = {
      projectId: PUBSUB_CONFIG.projectId,
      walletTopic: PUBSUB_CONFIG.walletTopic,
      withdrawalTopic: PUBSUB_CONFIG.withdrawalTopic,
      eventTopic: PUBSUB_CONFIG.eventTopic,
      walletSubscription: PUBSUB_CONFIG.walletSubscription,
      withdrawalSubscription: PUBSUB_CONFIG.withdrawalSubscription,
      eventSubscription: PUBSUB_CONFIG.eventSubscription,
    }

    this.client = new PubSub({
      projectId: this.config.projectId,
    })

    this.initPromise = this.ensureInfrastructure()
  }

  async onWalletMessage(handler: WalletMessageHandlerFn): Promise<void> {
    await this.initPromise
    this.attachHandler(this.walletSubscription, handler)
  }

  async onWithdrawalMessage(
    handler: WithdrawalMessageHandlerFn
  ): Promise<void> {
    await this.initPromise
    this.attachHandler(this.withdrawalSubscription, handler)
  }

  async publish<TMessage = unknown>(message: TMessage): Promise<void> {
    await this.initPromise
    await this.eventTopic.publishMessage({ json: message as any })
  }

  private async ensureInfrastructure(): Promise<void> {
    const walletTopic = await this.ensureTopic(this.config.walletTopic)
    const withdrawalTopic = await this.ensureTopic(this.config.withdrawalTopic)
    this.eventTopic = await this.ensureTopic(this.config.eventTopic)

    this.walletSubscription = await this.ensureSubscription(
      walletTopic,
      this.config.walletSubscription
    )
    this.withdrawalSubscription = await this.ensureSubscription(
      withdrawalTopic,
      this.config.withdrawalSubscription
    )

    // evento solo publica; no suscripción automática
  }

  private async ensureTopic(name: string): Promise<Topic> {
    const topic = this.client.topic(name)
    const [exists] = await topic.exists()
    if (!exists) {
      await topic.create()
    }
    return topic
  }

  private async ensureSubscription(
    topic: Topic,
    subscriptionName: string
  ): Promise<Subscription> {
    const subscription = topic.subscription(subscriptionName)
    const [exists] = await subscription.exists()
    if (!exists) {
      await topic.createSubscription(subscriptionName)
    }
    return subscription
  }

  private attachHandler(
    subscription: Subscription,
    handler: WalletMessageHandlerFn | WithdrawalMessageHandlerFn
  ) {
    subscription.on("message", async (message) => {
      try {
        const data = message.data ? message.data.toString() : ""
        const parsed = data ? JSON.parse(data) : null
        await handler(parsed)
        message.ack()
      } catch (err) {
        console.error("PubSub handler error", err)
        message.nack()
      }
    })

    subscription.on("error", (err) => {
      console.error("PubSub subscription error", err)
    })
  }
}

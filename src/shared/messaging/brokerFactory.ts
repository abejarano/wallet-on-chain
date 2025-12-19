import { CLOUD_PROVIDER, CloudProvider } from "@/config/app.constants"
import { PUBSUB_CONFIG, SQS_CONFIG } from "@/config/messaging.constants"
import { IMessageBroker } from "@/shared/messaging/interface"
import { SqsMessageBroker } from "@/shared/messaging/SqsMessageBroker"
import { PubSubMessageBroker } from "@/shared/messaging/PubSubMessageBroker"

/**
 * Resuelve el broker de comandos según la nube configurada.
 * Implementaciones son placeholders; inyecta tus clientes reales.
 */
export function resolveCommandBroker(): IMessageBroker {
  if (CLOUD_PROVIDER === CloudProvider.GCP) {
    void PUBSUB_CONFIG
    return new PubSubMessageBroker()
  }

  void SQS_CONFIG
  return new SqsMessageBroker()
}

# Bounded Contexts (Custody Service)

El servicio actual cubre principalmente el **contexto de Custodia** y parte del flujo de **Retiros**. Otros contextos (Orchestrator/API y Ledger) viven en servicios separados y se comunican por eventos asíncronos.

## Custodia (este repo)
- **Wallets**: creación y derivación HD (`AwsKmsOnlyKeyManager`, `AwsSealedMnemonicKeyManager`, `GcpKmsOnlyKeyManager`, `GcpSealedMnemonicKeyManager`), repos Mongo (`IWalletRepository`, `ISealedSecretRepository`, `IHdWalletIndexRepository`).
- **Retiros**: `WithdrawalMessageHandler` + `WithdrawalService` consumen mensajes del broker, reservan fondos vía `ILedgerGateway`, ejecutan adaptadores de red (`IChainWithdrawalAdapter`) y publican eventos reutilizando el mismo `IMessageBroker.publish`.
- **Clave/nube**: `resolveKeyManager` selecciona AWS/GCP y estrategia (KMS-only vs sealed mnemonic). BYOK para multi-cloud.
- **Broker**: `IMessageBroker` abstrae SQS/PubSub; selección vía `resolveCommandBroker`. Implementaciones listas (`SqsMessageBroker`, `PubSubMessageBroker`) crean topics/suscripciones/colas con nombres coherentes por ambiente.
- **Adaptadores de red**:
  - `NodeRpcWithdrawalAdapter` (nodos propios RPC; pendiente implementación UTXO/nonce/broadcast).
  - `TatumWithdrawalAdapter` / `CryptoApiWithdrawalAdapter` (broadcast vía proveedor, firma local).
  - Selección por `PROVIDER_VENDOR`.

## Ledger / Balances (otro servicio)
- Implementa `ILedgerGateway` (cliente en `LedgerHttpGateway`) para balance disponible, reservas y marca de retiros completados.
- Custodia nunca actualiza DB contable directa; usa el puerto `ILedgerGateway`.

## Orchestrator / API pública (otro servicio)
- Expone endpoints al frontend, valida negocio y publica comandos al broker (wallet/withdrawal). No vive en este repo.

## Depósitos (ingestión de webhooks)
- Webhooks de Tatum/CryptoAPIs deben ser ingeridos por un servicio externo que valide HMAC, idempotencia y actualice ledger. Custodia solo firma/broadcast retiros.

## Infra compartida (mensajería)
- Los brokers (SQS/PubSub) son infraestructura común (`shared/messaging/`). Se nombran con los mismos topics en cualquier nube (`BROKER_WALLET_TOPIC`, `BROKER_WITHDRAWAL_TOPIC`, `BROKER_EVENTS_TOPIC`).

## Entry point
- `worker.ts` es el composition root para Kubernetes: resuelve broker, key manager, repos y `WithdrawalService`; registra los handlers en el broker.

## Pendientes principales
- Implementar `LedgerHttpGateway`, clientes RPC/Tatum/CryptoAPIs y key managers GCP. El broker SQS/PubSub ya publica/consume usando los topics/colas configurados.
- Opcional: mover brokers a un módulo compartido (`shared/messaging`) si otros contextos los consumen directamente.

# Arquitectura (clean-ish)

Objetivo: aislar contratos de dominio, orquestadores de casos de uso y adaptadores de infraestructura para poder
reemplazar bases de datos, brokers o clientes de red sin tocar reglas de negocio.

## Capas y módulos

- **domain/**
    - `wallet/interface/`: contratos `IWalletRepository`, `IHdWalletIndexRepository`, `ISealedSecretRepository` y tipo
      `IKeyManager`.
    - `withdrawal/`: tipos `IWithdrawalMessage/Event` y puertos `ILedgerGateway`, `IChainWithdrawalAdapter`.
    - `events/`: `IEventPublisher<T>` genérico para reutilizar en distintos flujos (retiros, creación de
      wallet/direcciones, etc.).
- **application/**
    - `wallet/WalletMessageHandler`: handler de mensajes de creación/derivación de wallets (espera un `IKeyManager`).
    - `withdrawal/WithdrawalMessageHandler`: traduce mensajes del broker a `IWithdrawalMessage`.
    - `withdrawal/WithdrawalService`: orquesta un retiro (chequeo de fondos → reserva → ejecución de adaptador →
      publicación de evento).
- **infrastructure/**
    - `crypto/`: key managers KMS/mnemónico, helpers de direcciones, cliente KMS y utilidades de cifrado.
    - `withdrawals/`: `HdWalletKeyService` y adaptadores concretos para BTC/ETH/TRX.

Dependencias entre capas: `domain` (no depende de nadie) → `application` (consume solo contratos de dominio) →
`infrastructure` (implementa contratos y helpers). La composición final ocurre fuera del repo (API/worker) inyectando
las implementaciones deseadas.

## Entry points sugeridos

- **Brokers/colas**: conecta los mensajes entrantes a `WalletCommand.handle` y `WithdrawalCommand.handleBrokerMessage`.
- **Key managers**: elige entre `AwsKmsOnlyKeyManager` / `AwsSealedMnemonicKeyManager` (AWS) o `GcpKmsOnlyKeyManager` /
  `GcpSealedMnemonicKeyManager` (GCP) según tu estrategia de claves; implementan `IKeyManager`.
- **Adaptadores de red**: registra las instancias que apliquen en `WithdrawalService` (`BitcoinWithdrawalAdapter`,
  `EthereumWithdrawalAdapter`, `TronWithdrawalAdapter`), configurándolos con los clientes de nodo/token que uses.

## Contexto Epic: orquestadores y servicios externos
- **Withdrawal Orchestrator** (fuera de este repo): prepara solicitudes de retiro y las publica en el broker. Aquí se consumen con `WithdrawalMessageHandler`.
- **Custody Service** (este repo): crea wallets/deriva direcciones, firma localmente y ejecuta `WithdrawalService` con adaptadores de red (RPC propio o proveedores como Tatum/CryptoAPIs). Envía XPUB a proveedores cuando aplique.
- **epic-ledger-api / Ledger Core**: implementa `ILedgerGateway` para reservar/liberar fondos y marcar retiros completados. Se inyecta en `WithdrawalService`.
- **Webhook/adapter por proveedor**: Tatum/CryptoAPIs envían webhooks de depósitos. Tu ingestor externo valida HMAC, idempotencia y actualiza ledger; este servicio firma y hace broadcast en retiros.

## Proveedores de red (broadcast)
- **Node RPC**: adaptador para nodos propios (Bitcoin Core/Geth/Tron). Firma localmente y transmite `sendrawtransaction`.
- **Tatum / CryptoAPIs**: adaptadores que firman localmente y usan la API del proveedor sólo para broadcast. Selección por `PROVIDER_VENDOR`.

## Brokers y nube
- `CLOUD_PROVIDER` selecciona AWS o GCP. `resolveCommandBroker` crea `SqsMessageBroker` (AWS) o `PubSubMessageBroker` (GCP) sobre los mismos nombres lógicos de topic/cola configurados en `BROKER_*`.
- Los handlers (`WalletMessageHandler`, `WithdrawalMessageHandler`) se suscriben al broker en el entrypoint (`worker.ts`).

## Implementaciones faltantes

Persistencia (repositorios), gateways de contabilidad y wiring de clientes RPC no vienen en
el repo; deben implementarse en tu proyecto host respetando los contratos de `src/domain/*`. Los brokers SQS/PubSub ya
publican/suscriben; configura tus variables de entorno (`BROKER_WALLET_TOPIC`, `BROKER_WITHDRAWAL_TOPIC`,
`BROKER_EVENTS_TOPIC`, URLs/colas/subs).

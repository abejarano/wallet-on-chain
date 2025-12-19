# wallet-custody-service

Servicio de custodia/on-chain que crea/deriva wallets HD y orquesta retiros para BTC, ETH y TRX (incluye USDT en ERC20/TRC20). Trae lógica de dominio y adaptadores, pero **no** la infraestructura concreta (DB, colas, RPCs ni despliegues de nodos).

## Qué incluye este repo

- `src/domain`: contratos de wallets (`IKeyManager`, repos) y retiros (`ILedgerGateway`, `IChainWithdrawalAdapter`, eventos).
- `src/application`: handlers de mensajes `WalletMessageHandler` y `WithdrawalMessageHandler`, y `WithdrawalService` como orquestador.
- `src/infrastructure`: key managers AWS/GCP, helpers de cifrado/derivación, adaptadores de broadcast (RPC/Tatum/CryptoAPIs), repos Mongo y gateway HTTP de ledger (skeleton).
- `src/shared/messaging`: brokers SQS/PubSub y `resolveCommandBroker`.
- `src/worker.ts`: composition root sugerido para K8s/worker; registra los subscribers de comandos.

## Documentación

- docs/architecture.md
- docs/bounded-contexts.md
- docs/epic-custody-notes.md

## Flujos principales

- Suscripción a comandos: `resolveCommandBroker` elige SQS (AWS) o Pub/Sub (GCP) según `CLOUD_PROVIDER`. `startWalletCommandSubscriber` y `startWithdrawalCommandSubscriber` en `src/app.ts` conectan los handlers a las colas/topics configurados.
- Wallets: `WalletMessageHandler` maneja `CREATE_WALLET { ownerId, chain, assetCode }` y `DERIVE_ADDRESS { walletId }`. Usa `resolveKeyManager` para decidir entre KMS-only y sealed mnemonic (AWS/GCP) y persiste en `MongoWalletRepository` + `MongoSealedSecretRepository` + `MongoHdWalletIndexRepository`. `DERIVE_ADDRESS` solo funciona si el key manager expone `deriveAddress`.
- Retiros: `WithdrawalMessageHandler` normaliza el asset, busca el wallet del cliente y delega en `WithdrawalService`. El servicio convierte a unidades mínimas, consulta `ILedgerGateway.getAvailableBalance`, reserva fondos, ejecuta el adaptador (`IChainWithdrawalAdapter`), marca completado y publica el evento por el mismo broker. En error libera la reserva y publica `FAILED` con detalle y balance disponible.
- Eventos: el broker usado para comandos también publica eventos de retiro (`WithdrawalStatus.PROCESSED/FAILED` con `txid`, `reason`, `balanceAvailable`).

## Claves y key managers

- AWS: `AwsKmsOnlyKeyManager` (KMS puro, sin derivación HD) o `AwsSealedMnemonicKeyManager` (mnemónico BIP39 sellado con envelope encryption; deriva HD vía `IHdWalletIndexRepository`).
- GCP: `GcpKmsOnlyKeyManager` y `GcpSealedMnemonicKeyManager` con Cloud KMS (`GCP_KMS_DATA_KEY` para cifrado simétrico).
- Todos persisten wallets en `IWalletRepository`; los HD usan además `ISealedSecretRepository` e `IHdWalletIndexRepository`. Selección vía `WALLET_KEY_MANAGER` y `CLOUD_PROVIDER`.

## Adaptadores de retiro

- `resolveWithdrawalAdapters` elige según `PROVIDER_VENDOR`:
  - `NodeRpcWithdrawalAdapter`: placeholder para nodos propios (Bitcoin Core/Geth/Tron). Falta fetch de UTXO/nonce y construcción/broadcast de rawTx.
  - `TatumWithdrawalAdapter` y `CryptoApiWithdrawalAdapter`: placeholders de broadcast HTTP; `TatumClient`/`CryptoApiClient` tienen TODOs para payloads y registro de XPUB.
- Adaptadores directos por red ya listos para inyectar clientes concretos:
  - `BitcoinWithdrawalAdapter` (PSBT, requiere `IBitcoinNodeClient`).
  - `EthereumWithdrawalAdapter` (ETH/ERC20 usando `ethers.JsonRpcProvider` y `tokenConfig`).
  - `TronWithdrawalAdapter` (TRX/TRC20 con `ITronWebClient`).
- `HdWalletKeyService` desencripta el mnemónico sellado y deriva la clave privada/pública para firmar.

## Persistencia, ledger y mensajería

- Repos Mongo (`MongoWalletRepository`, `MongoSealedSecretRepository`, `MongoHdWalletIndexRepository`) usan `@abejarano/ts-mongodb-criteria`; inicializa la conexión en tu host antes de instanciarlos.
- `LedgerHttpGateway` es un skeleton para consumir `epic-ledger-api` (balance/reserva/liberación/marcado de retiro).
- Brokers:
  - SQS (`SqsMessageBroker`): resuelve URLs por nombre si no las pasas en config; hace long polling y borra mensajes al procesar.
  - Pub/Sub (`PubSubMessageBroker`): crea topics/subs si no existen y ack/nack según resultado.

## Configuración rápida (env)

- Claves/nube: `CLOUD_PROVIDER` (`AWS|GCP`), `WALLET_KEY_MANAGER` (`KmsOnlyKeyManager|SealedMnemonicKeyManager`), `AWS_KMS_KEY_ID`, `GCP_KMS_DATA_KEY`, `GCP_KMS_KEY_RING`, `GCP_KMS_LOCATION`, `GCP_KMS_PROTECTION_LEVEL`.
- Proveedores de retiro: `PROVIDER_VENDOR` (`NODE_RPC|TATUM|CRYPTOAPI`), `TATUM_API_KEY`/`TATUM_API_URL`, `CRYPTOAPIS_API_KEY`/`CRYPTOAPIS_API_URL`.
- Broker/topics: `BROKER_WALLET_TOPIC`, `BROKER_WITHDRAWAL_TOPIC`, `BROKER_EVENTS_TOPIC`.
- SQS: `AWS_REGION`, `SQS_WALLET_QUEUE_URL|NAME`, `SQS_WITHDRAWAL_QUEUE_URL|NAME`, `SQS_EVENTS_QUEUE_URL|NAME`.
- Pub/Sub: `GCP_PROJECT`, `PUBSUB_WALLET_SUB`, `PUBSUB_WITHDRAWAL_SUB`, `PUBSUB_EVENTS_SUB`.
- Ledger: `LEDGER_API_URL`, `LEDGER_API_KEY`.

## Ejecutar

1. Requisitos: Node.js 18+, credenciales AWS/GCP según clave, conexión Mongo inicializada.
2. Instalar dependencias: `npm install`.
3. Compilar: `npm run build` (salida en `dist/`).
4. Ejecutar worker de ejemplo: `node dist/worker.js` con las variables de entorno cargadas y los clientes/colas configurados. Alternativamente importa `startWalletCommandSubscriber`/`startWithdrawalCommandSubscriber` en tu propio runtime.

## Pendientes notorios

- Implementar `LedgerHttpGateway` y los clientes RPC/Tatum/CryptoAPIs con payloads reales.
- Completar lógica de `NodeRpcWithdrawalAdapter` y registrar XPUB para depósitos en proveedores.
- Agregar validación de entrada y políticas de reintentos/backoff en llamadas a nodos/proveedores según tu plataforma.

# Epic Custody — mapa mental técnico (para no olvidarlo)

Este servicio es el **Custody Service**: crea/deriva wallets, firma localmente y orquesta retiros; no hostea nodos ni ledger ni orquestador.

## Dominios y casos de uso
- **Wallets**
- `AwsKmsOnlyKeyManager`: clave ECC_SECG_P256K1 no exportable en AWS KMS. No deriva HD.
- `AwsSealedMnemonicKeyManager`: seed BIP39 sellada con AWS KMS (Envelope Encryption) → deriva HD BIP44 y firma localmente.
  - Persistencia: `IWalletRepository`, `ISealedSecretRepository`, `IHdWalletIndexRepository`.
- **Retiros**
  - Handler: `WithdrawalMessageHandler` consume mensajes del broker.
  - Servicio: `WithdrawalService` (reserva fondos vía `ILedgerGateway`, ejecuta adaptador de red, marca retiro y publica evento).
  - Adaptadores: `IChainWithdrawalAdapter` → implementación por proveedor/nodo.

## Proveedores de red (Chain Adapters)
- **Nodo propio (RPC)**: `NodeRpcWithdrawalAdapter` (placeholder). Firma local y hace `sendrawtransaction` / `eth_sendRawTransaction` / broadcast Tron. Requiere UTXO/nonce fetch y construcción de rawTx por chain.
- **Tatum**: `TatumWithdrawalAdapter` (placeholder). Firma local, usa API de Tatum solo para broadcast. Debe enviar XPUB al proveedor para monitoreo de depósitos.
- **CryptoAPIs**: `CryptoApiWithdrawalAdapter` (placeholder). Igual modelo: firma local, broadcast vía API.
- Selección por `PROVIDER_VENDOR` (TATUM/CRYPTOAPI/NODE_RPC).

## Brokers (mensajería)
- `IMessageBroker` interfaz con `onWalletMessage`, `onWithdrawalMessage` y `publish` para eventos. Implementaciones: `SqsMessageBroker` y `PubSubMessageBroker` (topics/colas coherentes).
- Factory `resolveCommandBroker` elige:
  - AWS → `SqsMessageBroker` (pendiente wiring real a cola SQS).
  - GCP → `PubSubMessageBroker` (pendiente wiring real a tópico Pub/Sub).
- Entry `worker.ts` construye repos/servicios y registra handlers en el broker resuelto.

## KMS / Clouds
- `CLOUD_PROVIDER` (AWS|GCP) selecciona KMS y broker.
- Key managers GCP: `GcpKmsOnlyKeyManager` usa Cloud KMS EC secp256k1 (crea llave/version y firma digests). `GcpSealedMnemonicKeyManager` sella el mnemónico con una data key simétrica en Cloud KMS (`GCP_KMS_DATA_KEY`), deriva HD y firma localmente.
- Estrategias:
  - **KmsOnly**: máxima seguridad, sin derivación HD; cada wallet es una key en HSM.
  - **SealedMnemonic**: HD infinito, seed sellada con KMS (BYOK posible), firma local.
- BYOK / Multi-cloud: importar el mismo material en AWS KMS (EXTERNAL) y GCP Cloud HSM para firmas consistentes tras failover.

## Ledger y eventos
- `ILedgerGateway` (pendiente implementación real): balance, reservar/liberar, marcar completado.
- Publicar eventos de retiro (FAILED/PROCESSED) con el mismo `IMessageBroker.publish`.

## Webhooks de depósitos (fuera del repo)
- Proveedores (Tatum/CryptoAPIs) monitorean XPUB y envían webhooks.
- Ingestor externo debe: validar HMAC, idempotencia, actualizar ledger (`epic-ledger-api`), reflejar saldo (Pending → Disponible).
- El Custody Service no expone webhook; solo firma/broadcast en retiros.

## Entry points
- `worker.ts`: composition root (K8s). Resuelve broker, repos Mongo, key manager, WithdrawalService, handlers. Reemplaza placeholders de ledger/adapters antes de producción.
- `app.ts`: tipos y funciones de suscripción (no resuelve dependencias).

## Tareas pendientes (para completar arquitectura limpia)
- Implementar LedgerGateway real (client de `epic-ledger-api`).
- Completar adaptadores:
  - `NodeRpcWithdrawalAdapter`: construcción/firma/broadcast para BTC (UTXO), ETH/ERC20 (nonce/gas), TRX/TRC20.
  - `TatumWithdrawalAdapter` y `CryptoApiWithdrawalAdapter`: POST /broadcast con rawTx; carga XPUB al proveedor para depósitos.
- Wiring brokers:
  - SQS: leer cola, deserializar comando, llamar handlers.
  - Pub/Sub: suscribirse al tópico, idem.
- Repos Mongo ya listos; revisar `ts-mongodb-criteria` wiring real.
- Completar key managers GCP con Cloud KMS.
- Opcional: mover types (no implementables) a `types/` y dejar `interface` solo para puertos a implementar.

## Notas de resiliencia (a partir de los diagramas)
- Multi-AZ: health checks drenan tráfico a AZ sana; KMS regional sigue firmando; Ledger y Mongo Atlas siguen disponibles.
- Multi-región: GSLB conmuta a región B; claves replicadas en KMS Multi-Region; firma válida con misma identidad pública.
- Multi-cloud: BYOK en KMS/HSM de AWS y GCP; workload identity federation para acceder a claves importadas tras failover.

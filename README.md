# wallet-on-chain

Servicio de orquestación para crear wallets, derivar nuevas direcciones de pago y procesar retiros on-chain para BTC,
ETH y TRX (incluye USDT en ERC20/TRC20). El repo trae la lógica de dominio y los contratos de integración, pero **no**
incluye la infraestructura (DB, colas, RPCs, ni despliegues de nodos).

## Arquitectura

- `src/domain`: contratos y reglas de negocio (`wallet`, `withdrawal`), sin dependencias externas.
- `src/application`: orquestadores de casos de uso y handlers de entrada (colas/brokers).
- `src/infrastructure`: adaptadores concretos para KMS, cifrado, clientes de blockchain, brokers SQS/PubSub y helpers
  criptográficos.

Árbol breve:

```
src
├─ domain/
│  ├─ wallet/ (contratos de repositorios y key managers, p.ej. `IWalletRepository`, `IKeyManager`)
│  └─ withdrawal/ (puertos `ILedgerGateway`, tipos `IWithdrawalMessage/Event`)
├─ application/
│  ├─ wallet/WalletCommand.ts
│  └─ withdrawal/{WithdrawalCommand,WithdrawalService}.ts
└─ infrastructure/
   ├─ crypto/ (key managers KMS/mnemónico, helpers, kmsClient)
   └─ withdrawals/ (derivación de llaves HD y adaptadores BTC/ETH/TRX)
```

Más detalle en `docs/architecture.md`.

## Casos de uso cubiertos

- Crear wallet nuevo con AWS KMS puro (`AwsKmsOnlyKeyManager`) o con mnemónico sellado en KMS (`AwsSealedMnemonicKeyManager`); en GCP, usa `GcpKmsOnlyKeyManager` o `GcpSealedMnemonicKeyManager`.
- Derivar una nueva dirección de pago a partir de un wallet basado en mnemónico (`deriveAddress` en
  `SealedMnemonicKeyManager`).
- Procesar retiros on-chain multi‑asset (`WithdrawalService` + adaptadores BTC/ETH/TRX) publicando el estado del retiro.

## Flujo de creación/derivación de wallets

- Consumidor: `src/application/wallet/WalletCommand.ts`
    - Comando `CREATE_WALLET`: `{ type, ownerId, chain, assetCode }` → llama a `keyManager.createWallet`.
    - Comando `DERIVE_ADDRESS`: `{ type, walletId }` → busca el wallet base y ejecuta `deriveAddress` usando el
      siguiente índice HD disponible (requiere `SealedMnemonicKeyManager`).
- `AwsSealedMnemonicKeyManager`: `src/infrastructure/crypto/key-managers/aws/AwsSealedMnemonicKeyManager.ts` genera mnemónico
  BIP-39, lo sella con KMS, deriva la dirección `m/44'/coinType'/0'/0/index`, guarda `sealedSecretId` y
  `derivationPath`. Puede derivar nuevas direcciones sobre el mismo mnemónico.
- `AwsKmsOnlyKeyManager`: `src/infrastructure/crypto/key-managers/aws/AwsKmsOnlyKeyManager.ts` crea la clave ECDSA secp256k1 en
  KMS y deriva la dirección directamente desde la llave pública devuelta por KMS. No deriva nuevas direcciones.
 - `GcpSealedMnemonicKeyManager`: `src/infrastructure/crypto/key-managers/gcp/GcpSealedMnemonicKeyManager.ts` sella mnemónico con data key simétrica en Cloud KMS (`GCP_KMS_DATA_KEY`) y deriva HD/firma localmente.
 - `GcpKmsOnlyKeyManager`: `src/infrastructure/crypto/key-managers/gcp/GcpKmsOnlyKeyManager.ts` crea la clave secp256k1 en Cloud KMS y firma digests.
- `HdWalletKeyService`: `src/infrastructure/withdrawals/keys/HdWalletKeyService.ts` desencripta el mnemónico sellado y
  deriva la llave privada/pública para firmar o gastar fondos.

## Flujo de retiros on-chain

- Consumidor: `src/application/withdrawal/WithdrawalCommand.ts`
    - Recibe `{ clientId, withdrawalId, asset, amount, toAddress }`, resuelve el wallet del cliente y delega en
      `WithdrawalService`.
- Servicio: `src/application/withdrawal/WithdrawalService.ts`
    - Calcula montos en unidades mínimas, valida balance disponible vía `ILedgerGateway`, reserva fondos, ejecuta el
      adaptador de red y marca el retiro como completado o fallido.
- Adaptadores de red:
    - BTC: `src/infrastructure/withdrawals/adapters/BitcoinWithdrawalAdapter.ts` usa `BitcoinNodeClient` (PSBT:
      `walletCreateFundedPsbt`, `finalizePsbt`, `sendRawTransaction`).
    - ETH / ERC20: `src/infrastructure/withdrawals/adapters/EthereumWithdrawalAdapter.ts` usa `ethers.JsonRpcProvider` y
      opcional `tokenConfig` `{ address, decimals }`.
    - TRX / TRC20: `src/infrastructure/withdrawals/adapters/TronWithdrawalAdapter.ts` usa `TronWebClient` (`sendTrx`,
      `triggerSmartContract`, `sign`, `sendRawTransaction`) y `tokenConfig` `{ address, feeLimitSun }`.
- Publicación de estado: el `IMessageBroker.publish` envía eventos `PENDING/FAILED/PROCESSED` con `txid`, `reason` o
  `balanceAvailable` según corresponda. Puedes reutilizar el mismo broker para otros eventos de dominio (p.ej. creación
  de wallet/dirección).

## Piezas de infraestructura que debes implementar

- **Persistencia**
    - `IWalletRepository` (`src/domain/wallet/interface/KeyManager.interface.ts`): guardar/buscar wallets por filtros.
    - `ISealedSecretRepository` (`src/domain/wallet/interface/SealedSecretRepository.interface.ts`): guardar y recuperar el mnemónico
      sellado y metadatos KMS.
    - `IHdWalletIndexRepository` (`src/domain/wallet/interface/HdWalletIndexRepository.interface.ts`): asignar el siguiente índice HD de
      forma atómica para evitar colisiones.
- **Contabilidad y eventos**
    - `ILedgerGateway` (`src/domain/withdrawal/interfaces.ts`): balance disponible, reservar/liberar fondos y marcar
      retiros completados.
    - `IMessageBroker.publish` (ver `src/shared/messaging/interface`): publicar el evento del retiro procesado o fallido
      hacia tu cola/tópico de eventos. Implementaciones listas: `SqsMessageBroker` y `PubSubMessageBroker`.
- **Clientes de red**
    - Ethereum: instanciar `ethers.JsonRpcProvider` apuntando a tu nodo/servicio RPC.
    - Bitcoin: implementar `BitcoinNodeClient` (`walletCreateFundedPsbt`, `finalizePsbt`, `sendRawTransaction`) contra
      tu nodo/daemon.
    - Tron: proveer un `TronWebClient` compatible (similar a `tronweb`).
- **Brokers/colas**
    - Conecta tus mensajes entrantes a `WithdrawalCommand.handleBrokerMessage` y `WalletCommand.handle`.
    - Define tus topics/queues y serialización; el repo no trae wiring ni dependencias de mensajería.
- **Config**
    - Cargar `tokenConfig` para USDT ERC20/TRC20, `AWS_KMS_KEY_ID`, `AWS_REGION`, RPC URLs, timeouts, etc. Para GCP KMS: `GCP_PROJECT`, `GCP_KMS_KEY_RING`, opcional `GCP_KMS_LOCATION`, `GCP_KMS_PROTECTION_LEVEL` y `GCP_KMS_DATA_KEY` (llave simétrica usada para sellar el mnemónico).

## Claves y uso de AWS KMS

- Cliente KMS: `src/infrastructure/crypto/kms/kmsClient.ts` (usa `AWS_REGION` o `us-east-1` por defecto).
- `KmsOnlyKeyManager` (solo KMS):
    - `CreateKey` (`KeySpec: ECC_SECG_P256K1`, `KeyUsage: SIGN_VERIFY`)
    - `GetPublicKey` (para derivar dirección y `publicKeyHex`)
    - `Sign` (`MessageType: DIGEST`, `SigningAlgorithm: ECDSA_SHA_256`)
- `AwsSealedMnemonicKeyManager` (mnemónico sellado):
    - `GenerateDataKey` con `AWS_KMS_KEY_ID` para cifrar el mnemónico (AES-GCM local).
    - `Decrypt` para obtener la data key y desencriptar el mnemónico.
    - Derivación HD: `m/44'/coinType'/0'/0/index` (coin type en `src/infrastructure/crypto/config/Config.ts`).
    - Firmas: ECDSA secp256k1 con `@noble/secp256k1`; se calculan `v/recovery` para ETH/TRX.
- `HdWalletKeyService` desencripta el mnemónico y deriva la llave privada para firmar/broadcast.

## Ejecutar y construir

- Requisitos: Node.js 18+, credenciales AWS configuradas (para KMS).
- Instalar dependencias: `npm install`.
- Compilar: `npm run build` (salida en `dist/` con paths remapeados por `tsc-alias`).

## Notas y límites conocidos

- No hay validación de entrada ni rate limiting en los consumidores; implementa en el borde (API/cola).
- Las llamadas a nodos no manejan reintentos ni backoff; añade políticas al implementar los clientes RPC.
- `DERIVE_ADDRESS` solo funciona si el `keyManager` soporta `deriveAddress` (p.ej. `SealedMnemonicKeyManager`).

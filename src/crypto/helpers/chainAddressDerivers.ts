import { keccak_256 } from "@noble/hashes/sha3"
import crypto from "node:crypto"

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

// ---------- ETH, BTC, TRX (desde public key) ----------

/**
 * ETH address desde public key sin comprimir (0x04 + X(32) + Y(32))
 */
export function ethAddressFromUncompressedPublicKey(
  pubKeyUncompressed: Uint8Array
): string {
  const key =
    pubKeyUncompressed[0] === 0x04
      ? pubKeyUncompressed.slice(1)
      : pubKeyUncompressed
  const hash = keccak_256(key)
  const addr = hash.slice(-20)
  return "0x" + Buffer.from(addr).toString("hex")
}

/**
 * BTC P2PKH legacy: versión 0x00 + RIPEMD160(SHA256(compressedPubKey))
 */
export function btcP2PKHAddressFromUncompressedPublicKey(
  pubKeyUncompressed: Buffer
): string {
  const compressed = compressPublicKey(pubKeyUncompressed)
  const hash160 = ripemd160(sha256(compressed))
  const payload = Buffer.concat([Buffer.from([0x00]), hash160])
  return base58CheckEncode(payload)
}

/**
 * TRX: base58check(0x41 + keccak256(pubKey)[-20:])
 */
export function tronAddressFromUncompressedPublicKey(
  pubKeyUncompressed: Buffer
): string {
  const key =
    pubKeyUncompressed[0] === 0x04
      ? pubKeyUncompressed.slice(1)
      : pubKeyUncompressed
  const hash = keccak_256(key)
  const addr20 = Buffer.from(hash.slice(-20))
  const payload = Buffer.concat([Buffer.from([0x41]), addr20]) // 0x41 = Tron mainnet
  return base58CheckEncode(payload)
}

function base58CheckEncode(payload: Buffer): string {
  const checksum = sha256(sha256(payload)).subarray(0, 4)
  const full = Buffer.concat([payload, checksum])
  return base58Encode(full)
}

function sha256(buf: Buffer): Buffer {
  return crypto.createHash("sha256").update(buf).digest()
}

function ripemd160(buf: Buffer): Buffer {
  return crypto.createHash("ripemd160").update(buf).digest()
}

function base58Encode(buffer: Buffer): string {
  let x = BigInt("0x" + buffer.toString("hex"))
  const base = BigInt(58)
  let answer = ""

  while (x > 0n) {
    const mod = Number(x % base)
    x = x / base
    answer = BASE58_ALPHABET[mod] + answer
  }

  // leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    answer = "1" + answer
  }

  return answer
}

/**
 * Comprime un punto uncompressed 0x04|X|Y a 0x02/0x03|X
 */
function compressPublicKey(uncompressed: Buffer): Buffer {
  if (uncompressed.length !== 65 || uncompressed[0] !== 0x04) {
    throw new Error("Public key uncompressed inválida")
  }
  const x = uncompressed.subarray(1, 33)
  const y = uncompressed.subarray(33, 65)
  const isYOdd = (y[y.length - 1] & 1) === 1
  const prefix = isYOdd ? 0x03 : 0x02
  return Buffer.concat([Buffer.from([prefix]), x])
}

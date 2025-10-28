import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import * as ed25519 from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha2.js'

// Configure SHA512 for ed25519 (required for React Native)
ed25519.hashes.sha512 = sha512
ed25519.hashes.sha512Async = (m: Uint8Array) => Promise.resolve(sha512(m))

// Authority public key (Ed25519, exported from GCP KMS)
export const AUTHORITY_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAAqj8xwn6RCmZuOLPtRwaVSTzJ71SS1aEf2XCi4IEnDA=
-----END PUBLIC KEY-----`

const KEYS = {
  PRIVATE_KEY: 'meshmail_private_key',
  PUBLIC_KEY: 'meshmail_public_key',
  MESH_HANDLE: 'meshmail_mesh_handle',
  AUTHORITY_SIGNATURE: 'meshmail_authority_signature',
} as const

export interface KeyPair {
  privateKey: string
  publicKey: string
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

/**
 * Generate a new Ed25519 keypair using expo-crypto for randomness
 */
export async function generateKeyPair(): Promise<KeyPair> {
  // Generate 32 bytes of random data for the private key
  const randomBytes = await Crypto.getRandomBytesAsync(32)
  const privateKeyBytes = new Uint8Array(randomBytes)

  // Generate public key from private key
  const publicKeyBytes = await ed25519.getPublicKey(privateKeyBytes)

  // Convert to hex strings for storage
  const privateKey = bytesToHex(privateKeyBytes)
  const publicKey = bytesToHex(publicKeyBytes)

  return { privateKey, publicKey }
}

/**
 * Save keypair to secure storage
 */
export async function saveKeyPair(keyPair: KeyPair): Promise<void> {
  await SecureStore.setItemAsync(KEYS.PRIVATE_KEY, keyPair.privateKey)
  await SecureStore.setItemAsync(KEYS.PUBLIC_KEY, keyPair.publicKey)
}

/**
 * Load keypair from secure storage
 */
export async function loadKeyPair(): Promise<KeyPair | null> {
  const privateKey = await SecureStore.getItemAsync(KEYS.PRIVATE_KEY)
  const publicKey = await SecureStore.getItemAsync(KEYS.PUBLIC_KEY)

  if (!privateKey || !publicKey) {
    return null
  }

  return { privateKey, publicKey }
}

/**
 * Check if a keypair exists in secure storage
 */
export async function hasKeyPair(): Promise<boolean> {
  const keyPair = await loadKeyPair()
  return keyPair !== null
}

/**
 * Save mesh handle to secure storage
 */
export async function saveMeshHandle(handle: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.MESH_HANDLE, handle)
}

/**
 * Load mesh handle from secure storage
 */
export async function loadMeshHandle(): Promise<string | null> {
  return await SecureStore.getItemAsync(KEYS.MESH_HANDLE)
}

/**
 * Save authority signature to secure storage
 */
export async function saveAuthoritySignature(signature: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.AUTHORITY_SIGNATURE, signature)
}

/**
 * Load authority signature from secure storage
 */
export async function loadAuthoritySignature(): Promise<string | null> {
  return await SecureStore.getItemAsync(KEYS.AUTHORITY_SIGNATURE)
}

/**
 * Delete all stored keys (for key rotation)
 */
export async function deleteAllKeys(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.PRIVATE_KEY)
  await SecureStore.deleteItemAsync(KEYS.PUBLIC_KEY)
  await SecureStore.deleteItemAsync(KEYS.AUTHORITY_SIGNATURE)
  // Note: We keep the mesh handle since it's the user's identity
}

/**
 * Development/testing helper: fully reset onboarding by clearing keys AND address.
 * Do not call this in production flows unless doing an explicit key rotation UX.
 */
export async function resetAllData(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.PRIVATE_KEY)
  await SecureStore.deleteItemAsync(KEYS.PUBLIC_KEY)
  await SecureStore.deleteItemAsync(KEYS.AUTHORITY_SIGNATURE)
  await SecureStore.deleteItemAsync(KEYS.MESH_HANDLE)
}

/**
 * Build canonical attestation message (must match server-side format exactly).
 */
export function buildAttestationMessage(
  address: string,
  publicKeyHex: string
): string {
  const normalized = address.toLowerCase()
  return `meshmail.attestation.v1\naddress: ${normalized}\npubkey_ed25519_hex: ${publicKeyHex}`
}

/**
 * Verify an authority signature on an attestation.
 * Returns true if signature is valid.
 */
export async function verifyAttestation(
  address: string,
  publicKeyHex: string,
  signatureBase64: string
): Promise<boolean> {
  try {
    // Reconstruct the canonical message
    const message = buildAttestationMessage(address, publicKeyHex)
    const messageBytes = new TextEncoder().encode(message)

    // Decode signature from base64
    const signatureBytes = hexToBytes(
      Buffer.from(signatureBase64, 'base64').toString('hex')
    )

    // Extract Ed25519 public key from PEM
    // PEM format for Ed25519: 12 bytes prefix + 32 bytes public key
    const pemBody = AUTHORITY_PUBLIC_KEY_PEM.replace(
      /-----BEGIN PUBLIC KEY-----/,
      ''
    )
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '')
    const derBytes = hexToBytes(Buffer.from(pemBody, 'base64').toString('hex'))

    // Ed25519 public key is the last 32 bytes of the DER encoding
    const authorityPublicKeyBytes = derBytes.slice(-32)

    // Verify signature
    return await ed25519.verify(
      signatureBytes,
      messageBytes,
      authorityPublicKeyBytes
    )
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

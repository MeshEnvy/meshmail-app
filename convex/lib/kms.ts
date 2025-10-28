'use node'

import { KeyManagementServiceClient } from '@google-cloud/kms'

interface KMSConfig {
  project: string
  location: string
  keyring: string
  key: string
  credentialsBase64: string
}

function getKMSConfig(): KMSConfig {
  const project = process.env.GCP_KMS_PROJECT
  const location = process.env.GCP_KMS_LOCATION
  const keyring = process.env.GCP_KMS_KEYRING
  const key = process.env.GCP_KMS_KEY
  const credentialsBase64 = process.env.GCP_KMS_CREDENTIALS_BASE64

  if (!project || !location || !keyring || !key || !credentialsBase64) {
    throw new Error('Missing required GCP KMS environment variables')
  }

  return { project, location, keyring, key, credentialsBase64 }
}

let kmsClient: KeyManagementServiceClient | null = null

function getKMSClient(): KeyManagementServiceClient {
  if (kmsClient) return kmsClient

  const config = getKMSConfig()
  const credentials = JSON.parse(
    Buffer.from(config.credentialsBase64, 'base64').toString('utf-8')
  )

  kmsClient = new KeyManagementServiceClient({ credentials })
  return kmsClient
}

/**
 * Build canonical attestation message for signing.
 */
export function buildAttestationMessage(
  address: string,
  publicKeyHex: string
): string {
  const normalized = address.toLowerCase()
  return `meshmail.attestation.v1\naddress: ${normalized}\npubkey_ed25519_hex: ${publicKeyHex}`
}

/**
 * Sign an attestation using GCP KMS with Ed25519.
 * Returns base64-encoded signature.
 */
export async function signAttestation(
  address: string,
  publicKeyHex: string
): Promise<string> {
  const config = getKMSConfig()
  const client = getKMSClient()

  const message = buildAttestationMessage(address, publicKeyHex)
  const messageBytes = Buffer.from(message, 'utf-8')

  const versionName = `projects/${config.project}/locations/${config.location}/keyRings/${config.keyring}/cryptoKeys/${config.key}/cryptoKeyVersions/1`

  const [signResponse] = await client.asymmetricSign({
    name: versionName,
    // For Ed25519, KMS expects raw message (no pre-hashing)
    data: messageBytes,
  })

  if (!signResponse.signature) {
    throw new Error('KMS signing failed: no signature returned')
  }

  // Return as base64 for storage and transmission
  return Buffer.from(signResponse.signature as Uint8Array).toString('base64')
}

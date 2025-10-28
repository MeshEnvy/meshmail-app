'use node'

import { action } from './_generated/server'
import { v } from 'convex/values'
import { signAttestation } from './lib/kms'
import { api } from './_generated/api'

/**
 * Node.js action to register an address with KMS signing.
 */
export const registerAddressAction = action({
  args: {
    address: v.string(),
    publicKey: v.string(),
  },
  handler: async (ctx, { address, publicKey }) => {
    const trimmed = address.trim()

    // Validate address format
    if (!/^[a-zA-Z0-9.]{1,16}$/.test(trimmed)) {
      throw new Error('Invalid address format')
    }

    // Validate public key format
    if (!/^[a-f0-9]{64}$/i.test(publicKey)) {
      throw new Error('Invalid public key format')
    }

    // Check if address is available
    const availability = await ctx.runQuery(api.users.isAddressAvailable, {
      address: trimmed,
    })

    if (!availability.available) {
      throw new Error(
        availability.reason === 'invalid'
          ? 'Invalid address format'
          : 'Address already taken'
      )
    }

    // Sign using KMS
    const signature = await signAttestation(trimmed, publicKey)

    // Store in database
    await ctx.runMutation(api.users.registerAddressMutation, {
      address: trimmed,
      publicKey,
      signature,
    })

    return { signature }
  },
})

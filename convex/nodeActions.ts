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
    const trimmed = address.trim().toLowerCase()

    // Validate public key format
    if (!/^[a-f0-9]{64}$/i.test(publicKey)) {
      throw new Error('Invalid public key format')
    }

    // Check if address is available (this also validates the format)
    const availability = await ctx.runQuery(api.users.isAddressAvailable, {
      address: trimmed,
    })

    if (!availability.available) {
      // Provide user-friendly error messages
      switch (availability.reason) {
        case 'taken':
          throw new Error('Address already taken')
        case 'must_start_with_letter':
          throw new Error('Address must start with a letter')
        case 'reserved_prefix':
          throw new Error('This address prefix is reserved')
        case 'must_be_lowercase':
          throw new Error('Address must be lowercase')
        case 'invalid_format':
          throw new Error('Invalid address format')
        default:
          throw new Error('Address not available')
      }
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

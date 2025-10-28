import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const isAddressAvailable = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalized = address.trim().toLowerCase()
    const valid = /^[a-z0-9.]{1,16}$/.test(normalized)
    if (!valid) return { available: false, reason: 'invalid' as const }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_addressLower', (q) => q.eq('addressLower', normalized))
      .unique()

    return {
      available: !existing,
      reason: !existing ? 'available' : ('taken' as const),
    }
  },
})

/**
 * Internal mutation to store a registered address.
 * This is called by the Node.js action after KMS signing.
 */
export const registerAddressMutation = mutation({
  args: {
    address: v.string(),
    publicKey: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, { address, publicKey, signature }) => {
    const normalized = address.toLowerCase()

    // Double-check that address is not taken (race condition protection)
    const existing = await ctx.db
      .query('users')
      .withIndex('by_addressLower', (q) => q.eq('addressLower', normalized))
      .unique()

    if (existing) {
      throw new Error('Address already taken')
    }

    // Store user record
    await ctx.db.insert('users', {
      address,
      addressLower: normalized,
      publicKey,
      signature,
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

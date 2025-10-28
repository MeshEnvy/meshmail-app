import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// Reserved prefixes that cannot be used for addresses
const RESERVED_PREFIXES = [
  '911',
  'help',
  'info',
  'admin',
  'support',
  'noreply',
  'postmaster',
  'abuse',
  'security',
  'root',
  'system',
  'mail',
  'test',
]

function validateAddress(address: string): {
  valid: boolean
  reason?:
    | 'invalid_format'
    | 'must_start_with_letter'
    | 'reserved_prefix'
    | 'must_be_lowercase'
} {
  const normalized = address.trim().toLowerCase()

  // Check if original input matches normalized (must be lowercase)
  if (address.trim() !== normalized) {
    return { valid: false, reason: 'must_be_lowercase' }
  }

  // Must be 1-16 characters, only letters, numbers, and periods
  if (!/^[a-z0-9.]{1,16}$/.test(normalized)) {
    return { valid: false, reason: 'invalid_format' }
  }

  // Must start with a letter
  if (!/^[a-z]/.test(normalized)) {
    return { valid: false, reason: 'must_start_with_letter' }
  }

  // Check reserved prefixes
  for (const prefix of RESERVED_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return { valid: false, reason: 'reserved_prefix' }
    }
  }

  return { valid: true }
}

export const isAddressAvailable = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const validation = validateAddress(address)
    if (!validation.valid) {
      return { available: false, reason: validation.reason! }
    }

    const normalized = address.trim().toLowerCase()
    const existing = await ctx.db
      .query('users')
      .withIndex('by_address', (q) => q.eq('address', normalized))
      .unique()

    return {
      available: !existing,
      reason: !existing ? ('available' as const) : ('taken' as const),
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
    // Validate address format
    const validation = validateAddress(address)
    if (!validation.valid) {
      throw new Error(
        `Invalid address: ${validation.reason?.replace(/_/g, ' ')}`
      )
    }

    const normalized = address.toLowerCase()

    // Double-check that address is not taken (race condition protection)
    const existing = await ctx.db
      .query('users')
      .withIndex('by_address', (q) => q.eq('address', normalized))
      .unique()

    if (existing) {
      throw new Error('Address already taken')
    }

    // Store user record
    await ctx.db.insert('users', {
      address: normalized,
      publicKey,
      signature,
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

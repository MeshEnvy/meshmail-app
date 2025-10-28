import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    address: v.string(), // Must be lowercase (enforced by validation)
    publicKey: v.string(),
    signature: v.string(), // Authority signature (base64)
    createdAt: v.number(),
  }).index('by_address', ['address']), // Query by address
})

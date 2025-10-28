import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    address: v.string(), // Original casing
    addressLower: v.string(), // Normalized for uniqueness
    publicKey: v.string(),
    signature: v.string(), // Authority signature (base64)
    createdAt: v.number(),
  }).index('by_addressLower', ['addressLower']), // Query by normalized address
})

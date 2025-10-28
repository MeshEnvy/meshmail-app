import { ConvexReactClient } from 'convex/react'
import { Platform } from 'react-native'

// Prefer hosted Convex URL via env; fall back to local dev server.
const DEV_LOCAL_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8187' : 'http://127.0.0.1:8187'
const url = process.env.EXPO_PUBLIC_CONVEX_URL || DEV_LOCAL_URL

export const convex = new ConvexReactClient(url)

import React, { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View, ActivityIndicator, Text, Alert } from 'react-native'
import SetupScreen from './screens/SetupScreen'
import MainScreen from './screens/MainScreen'
import Logo from './assets/Logo'
import { ConvexProvider } from 'convex/react'
import { convex } from './lib/convexClient'
import {
  hasKeyPair,
  generateKeyPair,
  saveKeyPair,
  loadKeyPair,
  loadMeshHandle,
  saveMeshHandle,
  resetAllData,
  type KeyPair,
} from './lib/crypto'

type AppState = 'loading' | 'setup' | 'ready'

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [meshHandle, setMeshHandle] = useState<string>('')
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null)

  useEffect(() => {
    initializeApp()
  }, [])

  async function initializeApp() {
    try {
      const forceSetup = process.env.EXPO_PUBLIC_FORCE_ONBOARDING === '1'
      // Check if keypair exists
      const hasKeys = await hasKeyPair()

      if (!hasKeys) {
        // Generate new keypair on first launch
        console.log('Generating new keypair...')
        const newKeyPair = await generateKeyPair()
        await saveKeyPair(newKeyPair)
        console.log('Keypair generated and saved to keychain')
        setKeyPair(newKeyPair)
      } else {
        // Load existing keypair
        const existingKeyPair = await loadKeyPair()
        setKeyPair(existingKeyPair)
      }

      // Check if mesh handle is set or force setup
      const existingHandle = await loadMeshHandle()

      if (forceSetup || !existingHandle) {
        // Need to set up mesh handle
        setAppState('setup')
      } else {
        // Ready to go
        setMeshHandle(existingHandle)
        setAppState('ready')
      }
    } catch (error) {
      console.error('Failed to initialize app:', error)
      // TODO: Show error screen
    }
  }

  async function devResetOnboarding() {
    Alert.alert(
      'Reset Onboarding',
      'This will clear your MeshMail address, keys, and signature. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllData()
            await initializeApp()
          },
        },
      ]
    )
  }

  async function handleSetupComplete(handle: string) {
    try {
      await saveMeshHandle(handle)
      setMeshHandle(handle)
      setAppState('ready')
      console.log(`Mesh handle set to: @${handle}`)
    } catch (error) {
      console.error('Failed to save mesh handle:', error)
      throw error
    }
  }

  return (
    <ConvexProvider client={convex}>
      {appState === 'loading' && (
        <View style={styles.container}>
          <Logo size={120} />
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={styles.loader}
          />
          <Text style={styles.loadingText}>Initializing MeshMail...</Text>
          <StatusBar style="auto" />
        </View>
      )}
      {appState === 'setup' && (
        <>
          <SetupScreen onComplete={handleSetupComplete} />
          <StatusBar style="auto" />
        </>
      )}
      {appState === 'ready' && (
        <>
          <MainScreen
            meshHandle={meshHandle}
            publicKey={keyPair?.publicKey || ''}
            onDevReset={__DEV__ ? devResetOnboarding : undefined}
          />
          <StatusBar style="auto" />
        </>
      )}
    </ConvexProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
})

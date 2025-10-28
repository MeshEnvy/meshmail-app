import React, { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native'
import SetupScreen from './screens/SetupScreen'
import MainScreen from './screens/MainScreen'
import Logo from './assets/Logo'
import {
  hasKeyPair,
  generateKeyPair,
  saveKeyPair,
  loadKeyPair,
  loadMeshHandle,
  saveMeshHandle,
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

      // Check if mesh handle is set
      const existingHandle = await loadMeshHandle()

      if (!existingHandle) {
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

  if (appState === 'loading') {
    return (
      <View style={styles.container}>
        <Logo size={120} />
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        <Text style={styles.loadingText}>Initializing MeshMail...</Text>
        <StatusBar style="auto" />
      </View>
    )
  }

  if (appState === 'setup') {
    return (
      <>
        <SetupScreen onComplete={handleSetupComplete} />
        <StatusBar style="auto" />
      </>
    )
  }

  return (
    <>
      <MainScreen
        meshHandle={meshHandle}
        publicKey={keyPair?.publicKey || ''}
      />
      <StatusBar style="auto" />
    </>
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

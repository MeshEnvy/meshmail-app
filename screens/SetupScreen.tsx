import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import Logo from '../assets/Logo'
import { useConvex } from 'convex/react'
import { loadKeyPair, saveAuthoritySignature } from '../lib/crypto'

interface SetupScreenProps {
  onComplete: (handle: string) => void
}

export default function SetupScreen({ onComplete }: SetupScreenProps) {
  const convex = useConvex()
  const [handle, setHandle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)

  const handleTextChange = (text: string) => {
    // Only allow letters, numbers, and periods, max 16 characters
    const filtered = text.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 16)
    setHandle(filtered)
  }

  const isFormatValid = useMemo(
    () => /^[a-zA-Z0-9.]{1,16}$/.test(handle),
    [handle]
  )

  // Debounced availability check against Convex
  useEffect(() => {
    // Reset availability when input changes
    setAvailable(null)

    const trimmed = handle.trim()
    if (!trimmed || !/^[a-zA-Z0-9.]{1,16}$/.test(trimmed)) {
      setChecking(false)
      return
    }

    setChecking(true)
    const t = setTimeout(async () => {
      try {
        const res = (await (convex as any).query('users:isAddressAvailable', {
          address: trimmed,
        })) as { available: boolean }
        setAvailable(res.available)
      } catch (e) {
        // Network or server error: don't block user permanently
        setAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 350)

    return () => clearTimeout(t)
  }, [handle, convex])

  const handleSubmit = async () => {
    const trimmedHandle = handle.trim()

    if (!trimmedHandle) {
      Alert.alert('Invalid Address', 'Please enter a MeshMail address')
      return
    }

    // Validate handle format (alphanumeric and periods only)
    if (!/^[a-zA-Z0-9.]+$/.test(trimmedHandle)) {
      Alert.alert(
        'Invalid Address',
        'Address can only contain letters, numbers, and periods'
      )
      return
    }

    if (trimmedHandle.length < 1 || trimmedHandle.length > 16) {
      Alert.alert(
        'Invalid Address',
        'Address must be between 1 and 16 characters'
      )
      return
    }

    if (available === false) {
      Alert.alert('Address Unavailable', 'That address is already taken')
      return
    }

    setIsSubmitting(true)
    try {
      // Load the keypair that was generated on app init
      const keyPair = await loadKeyPair()
      if (!keyPair) {
        throw new Error('No keypair found')
      }

      // Register address with Convex (gets KMS signature)
      // Use the Node.js action instead of the old mutation
      const result = (await (convex as any).action(
        'nodeActions:registerAddressAction',
        {
          address: trimmedHandle,
          publicKey: keyPair.publicKey,
        }
      )) as { signature: string }

      // Store the authority signature in keychain
      await saveAuthoritySignature(result.signature)

      // Complete onboarding
      await onComplete(trimmedHandle)
    } catch (error) {
      console.error('Registration error:', error)
      Alert.alert(
        'Registration Failed',
        error instanceof Error
          ? error.message
          : 'Failed to register your MeshMail address'
      )
      setIsSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Logo size={160} />
          <Text style={styles.title}>MeshMail</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Choose your MeshMail Address</Text>
          <Text style={styles.hint}>
            This will be your unique identifier on the mesh network
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.prefix}>@</Text>
            <TextInput
              style={styles.input}
              value={handle}
              onChangeText={handleTextChange}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={!isSubmitting}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <Text style={styles.note}>
            Letters, numbers, and periods only (1-16 characters)
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (isSubmitting ||
              !isFormatValid ||
              checking ||
              available === false) &&
              styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={
            isSubmitting || !isFormatValid || checking || available === false
          }
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
  },
  prefix: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 20,
    paddingVertical: 16,
    color: '#000',
  },
  note: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})

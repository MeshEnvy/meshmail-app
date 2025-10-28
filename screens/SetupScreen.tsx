import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import Logo from '../assets/Logo'
import { useConvex } from 'convex/react'
import {
  loadKeyPair,
  saveAuthoritySignature,
  saveMeshHandle,
  restoreFromBackup,
  loadMeshHandle,
} from '../lib/crypto'

interface SetupScreenProps {
  onComplete: (handle: string) => void
}

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

function validateAddressFormat(address: string): {
  valid: boolean
  error?: string
} {
  // Must be lowercase
  if (address !== address.toLowerCase()) {
    return { valid: false, error: 'Must be lowercase' }
  }

  // Must be 1-16 characters, only letters, numbers, and periods
  if (!/^[a-z0-9.]{1,16}$/.test(address)) {
    if (address.length === 0) {
      return { valid: false, error: 'Required' }
    }
    if (address.length > 16) {
      return { valid: false, error: 'Max 16 characters' }
    }
    return { valid: false, error: 'Letters, numbers, periods only' }
  }

  // Must start with a letter
  if (!/^[a-z]/.test(address)) {
    return { valid: false, error: 'Must start with a letter' }
  }

  // Check reserved prefixes
  for (const prefix of RESERVED_PREFIXES) {
    if (address.startsWith(prefix)) {
      return { valid: false, error: `"${prefix}" prefix is reserved` }
    }
  }

  return { valid: true }
}

export default function SetupScreen({ onComplete }: SetupScreenProps) {
  const convex = useConvex()
  const [handle, setHandle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreCode, setRestoreCode] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)

  const handleTextChange = (text: string) => {
    // Only allow lowercase letters, numbers, and periods, max 16 characters
    const filtered = text
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '')
      .slice(0, 16)
    setHandle(filtered)
  }

  const formatValidation = useMemo(
    () => validateAddressFormat(handle),
    [handle]
  )

  // Debounced availability check against Convex
  useEffect(() => {
    // Reset availability when input changes
    setAvailable(null)
    setErrorMessage('')

    const trimmed = handle.trim()
    if (!trimmed) {
      return
    }

    // Check format first
    const validation = validateAddressFormat(trimmed)
    if (!validation.valid) {
      setErrorMessage(validation.error!)
      setChecking(false)
      return
    }

    setChecking(true)
    const t = setTimeout(async () => {
      try {
        const res = (await (convex as any).query('users:isAddressAvailable', {
          address: trimmed,
        })) as {
          available: boolean
          reason:
            | 'available'
            | 'taken'
            | 'invalid_format'
            | 'must_start_with_letter'
            | 'reserved_prefix'
            | 'must_be_lowercase'
        }

        setAvailable(res.available)
        if (!res.available) {
          switch (res.reason) {
            case 'taken':
              setErrorMessage('Address already taken')
              break
            case 'must_start_with_letter':
              setErrorMessage('Must start with a letter')
              break
            case 'reserved_prefix':
              setErrorMessage('This prefix is reserved')
              break
            case 'must_be_lowercase':
              setErrorMessage('Must be lowercase')
              break
            case 'invalid_format':
              setErrorMessage('Invalid format')
              break
          }
        } else {
          setErrorMessage('')
        }
      } catch (e) {
        // Network or server error: don't block user permanently
        setAvailable(null)
        setErrorMessage('')
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

    const validation = validateAddressFormat(trimmedHandle)
    if (!validation.valid) {
      Alert.alert('Invalid Address', validation.error!)
      return
    }

    if (available === false) {
      Alert.alert(
        'Address Unavailable',
        errorMessage || 'That address is not available'
      )
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

      // Save the handle to keychain
      await saveMeshHandle(trimmedHandle)

      // Complete setup immediately
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


  const handleRestoreAccount = async () => {
    if (!restoreCode.trim()) {
      Alert.alert('Error', 'Please enter your recovery code')
      return
    }

    setIsRestoring(true)
    try {
      // Restore credentials from backup
      await restoreFromBackup(restoreCode.trim())

      // Load the restored handle
      const restoredHandle = await loadMeshHandle()
      if (!restoredHandle) {
        throw new Error('Failed to load restored handle')
      }

      // Close modal and complete setup
      setShowRestoreModal(false)
      Alert.alert('Account Restored!', `Welcome back, @${restoredHandle}`, [
        {
          text: 'Continue',
          onPress: () => onComplete(restoredHandle),
        },
      ])
    } catch (error) {
      console.error('Restore error:', error)
      Alert.alert(
        'Restore Failed',
        error instanceof Error
          ? error.message
          : 'Invalid recovery code. Please check and try again.'
      )
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

            <View
              style={[
                styles.inputContainer,
                errorMessage && styles.inputContainerError,
              ]}
            >
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
              {checking && (
                <ActivityIndicator
                  size="small"
                  color="#007AFF"
                  style={styles.indicator}
                />
              )}
              {!checking && errorMessage && (
                <Text style={styles.errorIcon}>✗</Text>
              )}
              {!checking && available === true && handle.trim() && (
                <Text style={styles.successIcon}>✓</Text>
              )}
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : (
              <Text style={styles.note}>
                Lowercase letters, numbers, periods • Start with letter • 1-16
                chars
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (isSubmitting ||
                !formatValidation.valid ||
                checking ||
                available === false) &&
                styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={
              isSubmitting ||
              !formatValidation.valid ||
              checking ||
              available === false
            }
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={() => setShowRestoreModal(true)}
          >
            <Text style={styles.restoreButtonText}>
              Already have an account? Restore
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Restore Modal */}
      <Modal
        visible={showRestoreModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRestoreModal(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Restore Account</Text>
            </View>

            <Text style={styles.restoreInstructions}>
              Enter your recovery code or scan the QR code you saved when
              creating your account.
            </Text>

            <View style={styles.restoreInputContainer}>
              <TextInput
                style={styles.restoreInput}
                value={restoreCode}
                onChangeText={setRestoreCode}
                placeholder="Paste your recovery code here"
                multiline
                numberOfLines={4}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isRestoring}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.restoreSubmitButton,
                (!restoreCode.trim() || isRestoring) && styles.buttonDisabled,
              ]}
              onPress={handleRestoreAccount}
              disabled={!restoreCode.trim() || isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Restore Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowRestoreModal(false)
                setRestoreCode('')
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
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
  inputContainerError: {
    borderColor: '#FF3B30',
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
  indicator: {
    marginLeft: 8,
  },
  errorIcon: {
    fontSize: 20,
    color: '#FF3B30',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  successIcon: {
    fontSize: 20,
    color: '#34C759',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 8,
    fontWeight: '500',
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    padding: 24,
    paddingTop: 48,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  restoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  restoreInstructions: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  restoreInputContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F8F9FA',
    marginBottom: 24,
  },
  restoreInput: {
    fontSize: 14,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  restoreSubmitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
})

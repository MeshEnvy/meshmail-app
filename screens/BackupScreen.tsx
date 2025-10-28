import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { generateBackupCode } from '../lib/crypto'
import * as SecureStore from 'expo-secure-store'
import QRCode from 'react-native-qrcode-svg'
import * as MediaLibrary from 'expo-media-library'
import { File, Paths } from 'expo-file-system/next'
import { captureRef } from 'react-native-view-shot'
import SvgIcon from '../components/SvgIcon'
import DownloadIcon from '../assets/icons/DownloadIcon'
import CopyIcon from '../assets/icons/CopyIcon'

interface BackupScreenProps {
  meshHandle: string
  onComplete: () => void
  onBackupComplete?: () => void
}


export default function BackupScreen({ meshHandle, onComplete, onBackupComplete }: BackupScreenProps) {
  const [backupCode, setBackupCode] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const qrCodeRef = useRef<View>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    generateBackup()
    loadLastSavedDate()
  }, [])

  const loadLastSavedDate = async () => {
    try {
      const savedDate = await SecureStore.getItemAsync('lastBackupSaved')
      if (savedDate) {
        setLastSaved(new Date(savedDate))
      }
    } catch (error) {
      console.error('Failed to load last saved date:', error)
    }
  }

  const generateBackup = async () => {
    try {
      setIsGenerating(true)
      const code = await generateBackupCode()
      setBackupCode(code)
    } catch (error) {
      console.error('Failed to generate backup code:', error)
      Alert.alert('Error', 'Failed to generate backup code')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveQRCode = async () => {
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to save the QR code')
        return
      }

      // Capture the QR code container as an image
      const uri = await captureRef(qrCodeRef, {
        format: 'png',
        quality: 1.0,
      })

      // Save to photo library
      await MediaLibrary.saveToLibraryAsync(uri)
      
      const now = new Date()
      setLastSaved(now)
      await SecureStore.setItemAsync('lastBackupSaved', now.toISOString())
    } catch (error) {
      console.error('Failed to save QR code:', error)
      Alert.alert('Error', 'Failed to save QR code to Photos')
    }
  }


  const handleCopyQRCode = async () => {
    try {
      // Capture the QR code container as an image
      const uri = await captureRef(qrCodeRef, {
        format: 'png',
        quality: 1.0,
      })

      // Copy the image URI to clipboard
      await Clipboard.setString(uri)
      const now = new Date()
      setLastSaved(now)
      await SecureStore.setItemAsync('lastBackupSaved', now.toISOString())
    } catch (error) {
      console.error('Failed to copy QR code:', error)
      Alert.alert('Error', 'Failed to copy QR code to clipboard')
    }
  }


  if (isGenerating) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Generating Backup...</Text>
      </View>
    )
  }

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]} 
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Backup Your Account</Text>
        <Text style={styles.subtitle}>@{meshHandle}</Text>
      </View>

      <View style={styles.warningSection}>
        <Text style={styles.warningTitle}>⚠️ Important</Text>
        <Text style={styles.warningText}>
          Save this backup code to restore your account on a new device. 
          Keep it somewhere safe and private - there is no password reset.
        </Text>
      </View>

      {backupCode && (
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>QR Code</Text>
          <View style={styles.qrRow}>
            <View ref={qrCodeRef} style={styles.qrContainer}>
              <QRCode value={backupCode} size={200} />
            </View>
            <View style={styles.qrButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveQRCode}>
                <SvgIcon size={20} color="#333">
                  <DownloadIcon />
                </SvgIcon>
              </TouchableOpacity>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyQRCode}>
                <SvgIcon size={20} color="#333">
                  <CopyIcon />
                </SvgIcon>
              </TouchableOpacity>
            </View>
          </View>
          {lastSaved && (
            <View style={styles.successSection}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successText}>
                Last saved on {lastSaved.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.doneButton} onPress={onComplete}>
        <Text style={styles.doneButtonText}>Close</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#007AFF',
  },
  warningSection: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  qrSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  qrButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  saveButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4EDDA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C3E6CB',
  },
  successIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  successText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignSelf: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})

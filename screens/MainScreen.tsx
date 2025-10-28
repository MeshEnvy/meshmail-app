import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

interface MainScreenProps {
  meshHandle: string
  publicKey: string
  onDevReset?: () => void
}

export default function MainScreen({
  meshHandle,
  publicKey,
  onDevReset,
}: MainScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MeshMail</Text>
      <Text style={styles.handle}>@{meshHandle}</Text>
      {__DEV__ && onDevReset && (
        <TouchableOpacity style={styles.reset} onPress={onDevReset}>
          <Text style={styles.resetText}>Reset onboarding (dev)</Text>
        </TouchableOpacity>
      )}
      <View style={styles.keyContainer}>
        <Text style={styles.label}>Public Key:</Text>
        <Text style={styles.key} numberOfLines={2} ellipsizeMode="middle">
          {publicKey}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  handle: {
    fontSize: 24,
    color: '#007AFF',
    marginBottom: 32,
  },
  reset: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFEAEA',
  },
  resetText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
  },
  keyContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  key: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#333',
  },
})

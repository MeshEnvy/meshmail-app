import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native'
import EnvelopeIcon from '../assets/EnvelopeIcon'
import SvgIcon from '../components/SvgIcon'
import NotificationIcon from '../assets/icons/NotificationIcon'
import SettingsIcon from '../assets/icons/SettingsIcon'
import { getTotalPendingCount, getModulePendingCount, getUnviewedNotificationCount, getNotifications, markNotificationAsViewed, syncTasksAsNotifications, markAllNotificationsAsViewed, type Notification } from '../lib/tasks'

// Notifications List Component
function NotificationsList({ onAction }: { onAction: (actionType: string) => void }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([])

  React.useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const notifs = await getNotifications()
      setNotifications(notifs)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isViewed) {
      await markNotificationAsViewed(notification.id)
      await loadNotifications() // Refresh the list
    }
    
    if (notification.actionType !== 'none') {
      onAction(notification.actionType)
    }
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyNotifications}>
        <Text style={styles.emptyNotificationsText}>No notifications</Text>
      </View>
    )
  }

  return (
    <View style={styles.notificationsList}>
      {notifications.map((notification) => (
        <TouchableOpacity
          key={notification.id}
          style={[
            styles.notificationItem,
            !notification.isViewed && styles.unviewedNotification
          ]}
          onPress={() => handleNotificationPress(notification)}
        >
          <View style={styles.notificationContent}>
            <Text style={[
              styles.notificationTitle,
              !notification.isViewed && styles.unviewedNotificationTitle
            ]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationMessage}>
              {notification.message}
            </Text>
          </View>
          {!notification.isViewed && (
            <View style={styles.unviewedDot} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  )
}

interface MainScreenProps {
  meshHandle: string
  publicKey: string
  onDevReset?: () => void
  onBackup?: () => void
  onNotificationAction?: (actionType: string) => void
}

export default function MainScreen({
  meshHandle,
  publicKey,
  onDevReset,
  onBackup,
  onNotificationAction,
}: MainScreenProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [totalPendingCount, setTotalPendingCount] = useState(0)
  const [backupPendingCount, setBackupPendingCount] = useState(0)
  const [unviewedNotificationCount, setUnviewedNotificationCount] = useState(0)

  useEffect(() => {
    updateTaskCounts()
  }, [])

  const updateTaskCounts = async () => {
    try {
      // Sync tasks as notifications first
      await syncTasksAsNotifications()
      
      const total = await getTotalPendingCount()
      const backup = await getModulePendingCount('backup')
      const unviewed = await getUnviewedNotificationCount()
      setTotalPendingCount(total)
      setBackupPendingCount(backup)
      setUnviewedNotificationCount(unviewed)
    } catch (error) {
      console.error('Failed to update task counts:', error)
    }
  }

  const handleBackup = () => {
    setShowMenu(false)
    onBackup?.()
  }

  const handleNotificationPress = async () => {
    // Mark all notifications as viewed when bell is tapped
    await markAllNotificationsAsViewed()
    await updateTaskCounts() // Refresh counts
    setShowNotifications(true)
  }

  const handleNotificationAction = async (actionType: string) => {
    setShowNotifications(false)
    onNotificationAction?.(actionType)
  }

  // Refresh task counts periodically
  useEffect(() => {
    const interval = setInterval(updateTaskCounts, 1000)
    return () => clearInterval(interval)
  }, [])


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <EnvelopeIcon size={24} />
          <TouchableOpacity 
            style={styles.notificationButton} 
            onPress={handleNotificationPress}
          >
            <SvgIcon size={24} color="#333">
              <NotificationIcon />
            </SvgIcon>
            {unviewedNotificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unviewedNotificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gearButton} 
            onPress={() => setShowMenu(true)}
          >
            <SvgIcon size={24} color="#333">
              <SettingsIcon />
            </SvgIcon>
            {totalPendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalPendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
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

      {/* Settings Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.settingsContainer}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <TouchableOpacity style={styles.menuItem} onPress={handleBackup}>
              <Text style={styles.menuItemText}>Backup</Text>
              {backupPendingCount > 0 && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{backupPendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowNotifications(false)}
        >
          <View style={styles.notificationsContainer}>
            <Text style={styles.notificationsTitle}>Notifications</Text>
            <NotificationsList onAction={handleNotificationAction} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gearButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  settingsContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  menuBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  notificationsContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 300,
    maxHeight: 400,
  },
  notificationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  notificationsList: {
    maxHeight: 300,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unviewedNotification: {
    backgroundColor: '#F8F9FF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  unviewedNotificationTitle: {
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  unviewedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  emptyNotifications: {
    padding: 32,
    alignItems: 'center',
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#666',
  },
})

import * as SecureStore from "expo-secure-store";

export interface Task {
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface TaskModule {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isViewed: boolean;
  createdAt: string;
  actionType: "backup" | "settings" | "none";
}

// Task definitions
export const TASK_MODULES: TaskModule[] = [
  {
    id: "backup",
    name: "Backup",
    tasks: [
      {
        id: "backup_account",
        name: "Backup Account",
        isCompleted: false, // Will be determined dynamically
      },
    ],
  },
];

// Check if backup task is completed
export async function isBackupTaskCompleted(): Promise<boolean> {
  try {
    const savedDate = await SecureStore.getItemAsync("lastBackupSaved");
    return !!savedDate;
  } catch (error) {
    console.error("Failed to check backup task status:", error);
    return false;
  }
}

// Get all pending tasks across all modules
export async function getPendingTasks(): Promise<Task[]> {
  const pendingTasks: Task[] = [];

  for (const module of TASK_MODULES) {
    for (const task of module.tasks) {
      let isCompleted = false;

      // Check task completion based on task ID
      switch (task.id) {
        case "backup_account":
          isCompleted = await isBackupTaskCompleted();
          break;
        default:
          isCompleted = task.isCompleted;
      }

      if (!isCompleted) {
        pendingTasks.push({ ...task, isCompleted });
      }
    }
  }

  return pendingTasks;
}

// Get pending task count for a specific module
export async function getModulePendingCount(moduleId: string): Promise<number> {
  const pendingTasks = await getPendingTasks();
  const module = TASK_MODULES.find((m) => m.id === moduleId);

  if (!module) return 0;

  return pendingTasks.filter((task) =>
    module.tasks.some((moduleTask) => moduleTask.id === task.id)
  ).length;
}

// Get total pending task count across all modules
export async function getTotalPendingCount(): Promise<number> {
  const pendingTasks = await getPendingTasks();
  return pendingTasks.length;
}

// Clear all task-related data (for dev reset)
export async function clearAllTaskData(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync("lastBackupSaved");
    await SecureStore.deleteItemAsync("notifications");
    // Add other task-related storage keys here as they're added
  } catch (error) {
    console.error("Failed to clear task data:", error);
  }
}

// Notification management
export async function getNotifications(): Promise<Notification[]> {
  try {
    const notificationsJson = await SecureStore.getItemAsync("notifications");
    if (notificationsJson) {
      return JSON.parse(notificationsJson);
    }
    return [];
  } catch (error) {
    console.error("Failed to get notifications:", error);
    return [];
  }
}

export async function saveNotifications(
  notifications: Notification[]
): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      "notifications",
      JSON.stringify(notifications)
    );
  } catch (error) {
    console.error("Failed to save notifications:", error);
  }
}

export async function addNotification(
  notification: Omit<Notification, "id" | "createdAt">
): Promise<void> {
  try {
    const notifications = await getNotifications();
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    // Check if notification already exists (by title)
    const exists = notifications.some((n) => n.title === notification.title);
    if (!exists) {
      notifications.push(newNotification);
      await saveNotifications(notifications);
    }
  } catch (error) {
    console.error("Failed to add notification:", error);
  }
}

export async function markNotificationAsViewed(
  notificationId: string
): Promise<void> {
  try {
    const notifications = await getNotifications();
    const updatedNotifications = notifications.map((n) =>
      n.id === notificationId ? { ...n, isViewed: true } : n
    );
    await saveNotifications(updatedNotifications);
  } catch (error) {
    console.error("Failed to mark notification as viewed:", error);
  }
}

export async function getUnviewedNotificationCount(): Promise<number> {
  try {
    const notifications = await getNotifications();
    return notifications.filter((n) => !n.isViewed).length;
  } catch (error) {
    console.error("Failed to get unviewed notification count:", error);
    return 0;
  }
}

// Sync incomplete tasks as notifications
export async function syncTasksAsNotifications(): Promise<void> {
  try {
    const notifications = await getNotifications();
    const pendingTasks = await getPendingTasks();
    
    // Remove completed task notifications
    const taskIds = pendingTasks.map(task => task.id);
    const filteredNotifications = notifications.filter(notification => {
      // Keep non-task notifications
      if (!notification.title.includes("Backup Your Identity")) {
        return true;
      }
      // Remove backup notification if backup task is completed
      return taskIds.includes("backup_account");
    });
    
    // Add new task notifications
    for (const task of pendingTasks) {
      const exists = filteredNotifications.some(n => n.title === getTaskNotificationTitle(task.id));
      if (!exists) {
        const notification = createTaskNotification(task);
        filteredNotifications.push(notification);
      }
    }
    
    await saveNotifications(filteredNotifications);
  } catch (error) {
    console.error("Failed to sync tasks as notifications:", error);
  }
}

// Get notification title for task
function getTaskNotificationTitle(taskId: string): string {
  switch (taskId) {
    case "backup_account":
      return "Backup Your Identity";
    default:
      return "Complete Task";
  }
}

// Create notification from task
function createTaskNotification(task: Task): Notification {
  switch (task.id) {
    case "backup_account":
      return {
        id: `task_${task.id}`,
        title: "Backup Your Identity",
        message: "Back up your identity for the first time to secure your account",
        isViewed: false,
        createdAt: new Date().toISOString(),
        actionType: "backup",
      };
    default:
      return {
        id: `task_${task.id}`,
        title: "Complete Task",
        message: "You have a pending task to complete",
        isViewed: false,
        createdAt: new Date().toISOString(),
        actionType: "none",
      };
  }
}

// Mark all notifications as viewed (for when user taps bell)
export async function markAllNotificationsAsViewed(): Promise<void> {
  try {
    const notifications = await getNotifications();
    const updatedNotifications = notifications.map(n => ({ ...n, isViewed: true }));
    await saveNotifications(updatedNotifications);
  } catch (error) {
    console.error("Failed to mark all notifications as viewed:", error);
  }
}

// Initialize default notifications (now syncs tasks)
export async function initializeDefaultNotifications(): Promise<void> {
  await syncTasksAsNotifications();
}

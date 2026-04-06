import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { NOTIFICATION_CHANNEL_ID } from '@/constants/defaultValues';
import { getNotificationDateForTask } from '@/lib/date';
import { getSettings } from '@/lib/settings-repo';
import { getPendingTasks } from '@/lib/tasks-repo';

let notificationHandlerConfigured = false;

export function configureNotificationHandler() {
  if (notificationHandlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerConfigured = true;
}

async function ensureAndroidChannelAsync() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Напоминания о поливе',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Локальные напоминания о задачах по уходу за растениями',
  });
}

export async function requestNotificationPermissionsAsync(): Promise<boolean> {
  await ensureAndroidChannelAsync();

  const currentPermissions = await Notifications.getPermissionsAsync();

  if (
    currentPermissions.granted ||
    currentPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  return (
    requestedPermissions.granted ||
    requestedPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function refreshScheduledNotificationsAsync() {
  configureNotificationHandler();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [settings, pendingTasks] = await Promise.all([getSettings(), getPendingTasks()]);

  if (!settings.notificationsEnabled || pendingTasks.length === 0) {
    return {
      scheduledCount: 0,
      permissionGranted: null,
    };
  }

  const permissionGranted = await requestNotificationPermissionsAsync();

  if (!permissionGranted) {
    return {
      scheduledCount: 0,
      permissionGranted: false,
    };
  }

  let scheduledCount = 0;

  for (const task of pendingTasks) {
    const triggerDate = getNotificationDateForTask(
      task.scheduledDate,
      settings.notificationHour,
      settings.notificationMinute
    );

    if (!triggerDate) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: task.id,
      content: {
        title: 'Пора полить растение',
        body: `${task.plantName} (${task.plantSpecies}) требует внимания.`,
        data: {
          plantId: task.plantId,
          taskId: task.id,
          type: task.type,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? NOTIFICATION_CHANNEL_ID : undefined,
      },
    });

    scheduledCount += 1;
  }

  return {
    scheduledCount,
    permissionGranted: true,
  };
}

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { getCareTypeLabel } from '@/constants/careTypes';
import { NOTIFICATION_CHANNEL_ID } from '@/constants/defaultValues';
import { compareDateStrings, getNotificationDateForTask, todayString } from '@/lib/date';
import { getSettings } from '@/lib/settings-repo';
import { getPendingTasks } from '@/lib/tasks-repo';
import type { CareTaskWithPlant } from '@/types/task';

let notificationHandlerConfigured = false;

type NotificationTaskGroup = {
  id: string;
  referenceDate: string;
  triggerDate: Date;
  tasks: CareTaskWithPlant[];
};

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
    name: 'Напоминания по уходу',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Локальные напоминания о растениях, которым сейчас нужен уход',
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

function buildNotificationGroups(
  pendingTasks: CareTaskWithPlant[],
  notificationHour: number,
  notificationMinute: number
) {
  const today = todayString();
  const groups = new Map<string, NotificationTaskGroup>();

  for (const task of pendingTasks) {
    const referenceDate =
      compareDateStrings(task.scheduledDate, today) <= 0 ? today : task.scheduledDate;
    const triggerDate = getNotificationDateForTask(
      referenceDate,
      notificationHour,
      notificationMinute
    );

    if (!triggerDate) {
      continue;
    }

    const existingGroup = groups.get(referenceDate);

    if (existingGroup) {
      existingGroup.tasks.push(task);
      continue;
    }

    groups.set(referenceDate, {
      id: `care-summary-${referenceDate}`,
      referenceDate,
      triggerDate,
      tasks: [task],
    });
  }

  return Array.from(groups.values()).sort((left, right) => left.triggerDate.getTime() - right.triggerDate.getTime());
}

function buildNotificationContent(group: NotificationTaskGroup) {
  const uniquePlantNames = Array.from(new Set(group.tasks.map((task) => task.plantName)));
  const primaryTask = group.tasks[0];

  if (group.tasks.length === 1) {
    return {
      title: `${primaryTask.plantName} требует внимания`,
      body: `На сегодня запланировано: ${getCareTypeLabel(primaryTask.type).toLowerCase()}.`,
    };
  }

  if (uniquePlantNames.length === 1) {
    return {
      title: `${primaryTask.plantName} требует внимания`,
      body: `На эту дату есть ещё ${group.tasks.length - 1} задач(и) по уходу.`,
    };
  }

  const extraPlantCount = uniquePlantNames.length - 1;

  return {
    title: 'Растения требуют внимания',
    body:
      extraPlantCount > 0
        ? `${primaryTask.plantName} и ещё ${extraPlantCount} растений требуют ухода.`
        : `${primaryTask.plantName} требует ухода.`,
  };
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

  const taskGroups = buildNotificationGroups(
    pendingTasks,
    settings.notificationHour,
    settings.notificationMinute
  );

  let scheduledCount = 0;

  for (const group of taskGroups) {
    const content = buildNotificationContent(group);

    await Notifications.scheduleNotificationAsync({
      identifier: group.id,
      content: {
        title: content.title,
        body: content.body,
        data: {
          screen: 'schedule',
          date: group.referenceDate,
          plantId: group.tasks[0]?.plantId ?? null,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: group.triggerDate,
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

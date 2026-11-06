import * as Notifications from 'expo-notifications';
import type { Reminder } from '@muscu/engine';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export const notificationsSupported = true;

/** Autorisation déjà donnée, sans rien demander. */
export async function hasPermission(): Promise<boolean> {
  const s = await Notifications.getPermissionsAsync();
  return s.granted;
}

export async function askPermission(): Promise<boolean> {
  if (await hasPermission()) return true;
  const s = await Notifications.requestPermissionsAsync();
  return s.granted;
}

/** Remplace tous les rappels programmés par ceux du plan. */
export async function scheduleReminders(plan: Reminder[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: r.weekday, hour: r.hour, minute: r.minute },
    });
  }
  return plan.length;
}

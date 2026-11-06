// Aperçu web : pas de notifications locales.
import type { Reminder } from '@muscu/engine';

export const notificationsSupported = false;
export async function hasPermission(): Promise<boolean> { return false; }
export async function askPermission(): Promise<boolean> { return false; }
export async function scheduleReminders(_plan: Reminder[]): Promise<number> { return 0; }

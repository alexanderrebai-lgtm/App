import { useEffect } from 'react';
import { reminderPlan } from '@muscu/engine';
import { hasPermission, scheduleReminders } from '../lib/notifications';
import { useApp } from '../store/AppState';

/** Reprogramme les rappels quand le profil ou les réglages changent (si l'autorisation est déjà donnée). */
export function ReminderSync() {
  const { profile, reminders } = useApp();
  const key = profile ? `${profile.id}|${profile.sessionsPerWeek}|${profile.goal}|${(profile.supplements ?? []).join(',')}|${JSON.stringify(reminders)}` : '';
  useEffect(() => {
    if (!profile) return;
    hasPermission().then((ok) => (ok ? scheduleReminders(reminderPlan(profile, reminders)) : 0)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

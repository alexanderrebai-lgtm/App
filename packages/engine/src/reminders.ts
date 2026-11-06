// Rappels locaux : le moteur calcule quoi rappeler et quand, l'appli les programme.
import { content as defaultContent, type Content } from '@muscu/content';
import type { Profile } from './model';
import { WEEK_PATTERN } from './program';
import { supplementsForDay } from './supplements';

export interface Time { hour: number; minute: number }

export interface ReminderSettings {
  sessions: { on: boolean; time: Time };
  supplements: { on: boolean; time: Time };
  weighIn: { on: boolean; time: Time };
  meals: { on: boolean; times: [Time, Time, Time, Time] };
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  sessions: { on: true, time: { hour: 18, minute: 0 } },
  supplements: { on: true, time: { hour: 8, minute: 0 } },
  weighIn: { on: true, time: { hour: 8, minute: 30 } },
  meals: { on: false, times: [{ hour: 7, minute: 30 }, { hour: 12, minute: 15 }, { hour: 16, minute: 30 }, { hour: 19, minute: 45 }] },
};

export interface Reminder {
  id: string;
  /** 1 = dimanche … 7 = samedi (convention des notifications iOS et Android). */
  weekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

/** Lundi = 0 … dimanche = 6 → 1 = dimanche … 7 = samedi. */
const toNotifWeekday = (wd: number) => ((wd + 1) % 7) + 1;
const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Collation', 'Dîner'];

export function reminderPlan(p: Pick<Profile, 'sessionsPerWeek' | 'goal' | 'supplements'>, s: ReminderSettings, c: Content = defaultContent): Reminder[] {
  const out: Reminder[] = [];
  const pattern = WEEK_PATTERN[p.sessionsPerWeek];
  if (s.sessions.on) {
    pattern.forEach((d, wd) => {
      if (d.kind !== 'training') return;
      out.push({ id: `session-${wd}`, weekday: toNotifWeekday(wd), ...s.sessions.time, title: 'Séance du jour', body: 'Ta séance t’attend. Fais ton check-in et lance-la.' });
    });
  }
  if (s.supplements.on) {
    for (let wd = 0; wd < 7; wd++) {
      const ids = supplementsForDay(p, pattern[wd]!.kind === 'training', c);
      if (!ids.length) continue;
      const names = ids.map((id) => c.supplements.supplements.find((x) => x.id === id)!.name.toLowerCase());
      out.push({ id: `supp-${wd}`, weekday: toNotifWeekday(wd), ...s.supplements.time, title: 'Compléments', body: `À prendre aujourd’hui : ${names.join(', ')}.` });
    }
  }
  if (s.weighIn.on) out.push({ id: 'weigh-in', weekday: 1, ...s.weighIn.time, title: 'Pesée du dimanche', body: 'Pèse-toi le matin à jeun : l’appli ajuste tes calories.' });
  if (s.meals.on) {
    for (let wd = 0; wd < 7; wd++) {
      s.meals.times.forEach((t, k) => out.push({ id: `meal-${wd}-${k}`, weekday: toNotifWeekday(wd), ...t, title: MEALS[k]!, body: 'Ton repas du menu est prêt dans l’onglet Nutrition.' }));
    }
  }
  return out;
}

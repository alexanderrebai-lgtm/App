import { describe, expect, it } from 'vitest';
import {
  backupForProfile, DEFAULT_REMINDERS, EMPTY_BACKUP, exportBackup, fr, importBackup, lifeWeek, mergeBackups, reminderPlan,
  type BackupData,
} from '../src';
import { profile } from './fixtures';

describe('rappels', () => {
  it('séances aux jours prévus, compléments chaque jour, pesée le dimanche', () => {
    const plan = reminderPlan(profile({ sessionsPerWeek: 2, goal: 'strength' }), DEFAULT_REMINDERS);
    const sessions = plan.filter((r) => r.id.startsWith('session'));
    // lundi (2) et jeudi (5) en convention dimanche = 1
    expect(sessions.map((r) => r.weekday)).toEqual([2, 5]);
    expect(sessions[0]).toMatchObject({ hour: 18, minute: 0 });
    const supp = plan.filter((r) => r.id.startsWith('supp'));
    expect(supp).toHaveLength(7);
    // la caféine seulement les jours de séance
    expect(supp.find((r) => r.weekday === 2)!.body).toContain('caféine');
    expect(supp.find((r) => r.weekday === 3)!.body).not.toContain('caféine');
    expect(plan.find((r) => r.id === 'weigh-in')).toMatchObject({ weekday: 1 });
    expect(plan.some((r) => r.id.startsWith('meal'))).toBe(false);
  });
  it('repas : 4 rappels par jour, moins de 64 rappels au total (limite iOS)', () => {
    const plan = reminderPlan(profile({ sessionsPerWeek: 4 }), { ...DEFAULT_REMINDERS, meals: { ...DEFAULT_REMINDERS.meals, on: true } });
    expect(plan.filter((r) => r.id.startsWith('meal'))).toHaveLength(28);
    expect(plan.length).toBeLessThan(64);
  });
  it('tout désactivé : aucun rappel', () => {
    const off = { sessions: { ...DEFAULT_REMINDERS.sessions, on: false }, supplements: { ...DEFAULT_REMINDERS.supplements, on: false }, weighIn: { ...DEFAULT_REMINDERS.weighIn, on: false }, meals: { ...DEFAULT_REMINDERS.meals, on: false } };
    expect(reminderPlan(profile(), off)).toEqual([]);
  });
});

describe('hygiène de vie', () => {
  const L = (date: string, cigarettes: number, drinks: number) => ({ profileId: 'p', date, cigarettes, drinks });
  it('7 derniers jours, tendance et jours sans alcool', () => {
    const w = lifeWeek([L('2026-01-10', 5, 0), L('2026-01-09', 4, 2), L('2026-01-02', 12, 3)], '2026-01-10');
    expect(w.byDay).toHaveLength(7);
    expect(w.current).toEqual({ cigarettes: 9, drinks: 2 });
    expect(w.previous).toEqual({ cigarettes: 12, drinks: 3 });
    expect([w.cigarettes, w.drinks]).toEqual(['down', 'down']);
    expect(w.alcoholFreeDays).toBe(6);
    expect(fr.lifeMessage('cigarettes', w.cigarettes, 9)).toContain('moins');
    expect(fr.lifestyle.quitHelp.FR[0]).toMatchObject({ name: 'Tabac Info Service', phone: '39 89' });
  });
});

describe('sauvegarde v2 et fusion', () => {
  const a: BackupData = {
    ...EMPTY_BACKUP, profiles: [profile({ id: 'p1', weightKg: 65 })],
    weights: [{ profileId: 'p1', date: '2026-01-04', kg: 65 }, { profileId: 'p1', date: '2026-01-11', kg: 65.4 }],
    water: [{ profileId: 'p1', date: '2026-01-11', ml: 1500 }],
    recipePrefs: [{ profileId: 'p1', recipeId: 'pates-bolognaise', pref: 'favorite' }],
  };
  it('les nouvelles collections passent l’export et l’import', () => {
    const r = importBackup(exportBackup(a));
    expect(r.ok && r.backup.water).toEqual(a.water);
    expect(r.ok && r.backup.version).toBe(2);
  });
  it('une sauvegarde v1 reste lisible', () => {
    const v1 = JSON.parse(exportBackup(a));
    v1.version = 1;
    delete v1.water; delete v1.menuOverrides; delete v1.recipePrefs; delete v1.priceOverrides;
    const r = importBackup(JSON.stringify(v1));
    expect(r.ok && r.backup.water).toEqual([]);
  });
  it('fusion : union des entrées, la plus récente l’emporte', () => {
    const b: BackupData = {
      ...EMPTY_BACKUP, profiles: [profile({ id: 'p1', weightKg: 66 })],
      weights: [{ profileId: 'p1', date: '2026-01-11', kg: 65.6 }, { profileId: 'p1', date: '2026-01-18', kg: 66 }],
    };
    const m = mergeBackups(a, b);
    expect(m.profiles[0]!.weightKg).toBe(66);
    expect(m.weights.map((w) => w.kg)).toEqual([65, 65.6, 66]);
    expect(m.water).toEqual(a.water);
    expect(m.recipePrefs).toHaveLength(1);
  });
  it('partage d’un seul profil', () => {
    const two = mergeBackups(a, { ...EMPTY_BACKUP, profiles: [profile({ id: 'p2' })], weights: [{ profileId: 'p2', date: '2026-01-11', kg: 80 }] });
    const only = backupForProfile(two, 'p2');
    expect(only.profiles.map((p) => p.id)).toEqual(['p2']);
    expect(only.weights).toHaveLength(1);
    expect(only.water).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { caffeineDose, coffeeCups, supplementsForDay, supplementsLeft, supplementWeek, usefulnessFor } from '../src';

describe('compléments', () => {
  it('caféine calculée sur le poids, plafonnée à 400 mg', () => {
    expect(caffeineDose(65)).toEqual({ startMg: 130, upToMg: 200, studiedMaxMg: 390 });
    expect(caffeineDose(90).studiedMaxMg).toBe(400);
    expect(coffeeCups(130)).toBe(1.5);
  });
  it('caféine seulement les jours de séance', () => {
    expect(supplementsForDay({ goal: 'strength' }, true)).toEqual(['creatine', 'caffeine', 'whey', 'omega3']);
    expect(supplementsForDay({ goal: 'strength' }, false)).toEqual(['creatine', 'whey', 'omega3']);
    expect(supplementsForDay({ goal: 'mass', supplements: ['vitaminD'] }, false)).toEqual(['vitaminD']);
  });
  it('restants du jour et suivi sur 7 jours', () => {
    const logs = [
      { profileId: 'p', date: '2026-01-10', supplement: 'creatine' as const, taken: true },
      { profileId: 'p', date: '2026-01-09', supplement: 'creatine' as const, taken: true },
      { profileId: 'p', date: '2026-01-01', supplement: 'creatine' as const, taken: true },
    ];
    expect(supplementsLeft(['creatine', 'whey'], logs, '2026-01-10')).toEqual(['whey']);
    expect(supplementWeek(['creatine'], logs, '2026-01-10')).toEqual([{ id: 'creatine', days: 2 }]);
  });
  it('tableau d’utilité selon l’objectif', () => {
    expect(usefulnessFor('mass')[0]).toEqual({ name: 'Créatine monohydrate', level: 'recommended' });
    expect(usefulnessFor('cardio')[0]!.level).toBe('optional');
  });
});

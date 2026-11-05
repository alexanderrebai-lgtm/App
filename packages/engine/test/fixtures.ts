import type { Profile } from '../src';

export function profile(o: Partial<Profile> = {}): Profile {
  return {
    id: 'p1', name: 'Test', sex: 'male', weightKg: 65, heightCm: 175, age: 30,
    goal: 'mass', sessionsPerWeek: 2, level: 'beginner',
    startDate: '2026-01-05', firstUseDate: '2026-01-05',
    equipment: 'gym', backCare: false, dietTags: [], excludedIngredients: [],
    budgetMode: true, weeklyBudgetEur: 30,
    ...o,
  };
}

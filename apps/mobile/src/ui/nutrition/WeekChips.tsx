import { View } from 'react-native';
import { addDays, mondayOf, type IsoDate } from '@muscu/engine';
import { dayMonth } from '../../lib/format';
import { Chip } from '../Chip';

/** Choix de la semaine : celle-ci et les trois suivantes (la rotation fait 4 semaines). */
export function WeekChips({ today, value, onChange }: { today: IsoDate; value: number; onChange(w: number): void }) {
  const m = mondayOf(today);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {[0, 1, 2, 3].map((w) => (
        <Chip key={w} selected={w === value} onPress={() => onChange(w)}
          label={w === 0 ? 'Cette semaine' : w === 1 ? 'La suivante' : `Sem. du ${dayMonth(addDays(m, 7 * w))}`} />
      ))}
    </View>
  );
}

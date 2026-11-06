import { useState } from 'react';
import { programs } from '@muscu/content';
import { effectiveTargets } from '@muscu/engine';
import { num } from '../../lib/format';
import { useProfile } from '../../store/AppState';
import { colors } from '../../theme';
import { MenusView } from '../../ui/nutrition/MenusView';
import { RecipesView } from '../../ui/nutrition/RecipesView';
import { ShoppingView } from '../../ui/nutrition/ShoppingView';
import { TodayView } from '../../ui/nutrition/TodayView';
import { Screen } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { T } from '../../ui/Text';

type Tab = 'today' | 'menus' | 'recipes' | 'shopping';

export default function Nutrition() {
  const p = useProfile();
  const [tab, setTab] = useState<Tab>('today');
  const t = effectiveTargets(p);
  return (
    <Screen>
      <T v="title" accessibilityRole="header">Nutrition</T>
      <T v="detail" color={colors.mute} style={{ marginTop: -16 }}>
        {programs.goals[p.goal].name} · {num(t.kcal)} kcal · {t.protein} g de protéines · {t.carbs} g de glucides · {t.fat} g de lipides
      </T>
      <Segmented<Tab> value={tab} onChange={setTab} options={[
        { key: 'today', label: 'Jour' }, { key: 'menus', label: 'Menus' }, { key: 'recipes', label: 'Recettes' }, { key: 'shopping', label: 'Courses' },
      ]} />
      {tab === 'today' ? <TodayView /> : tab === 'menus' ? <MenusView /> : tab === 'recipes' ? <RecipesView /> : <ShoppingView />}
    </Screen>
  );
}

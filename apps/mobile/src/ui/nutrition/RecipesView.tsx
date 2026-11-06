import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { content, type Recipe } from '@muscu/content';
import { effectiveTargets, portionFactor, recipeAllowed, recipeCost, recipeMacros, scaleMacros } from '@muscu/engine';
import { CATEGORY_FR, euros } from '../../lib/food';
import { num } from '../../lib/format';
import { useApp, useProfile } from '../../store/AppState';
import { colors, fonts, radius, space, type as typeScale } from '../../theme';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { T } from '../Text';

const SHARE: Record<Recipe['category'], number> = { breakfast: 0.25, main: 0.3, snack: 0.15 };
const FILTERS = [
  ['budget', 'Budget'], ['vegetarian', 'Végétarien'], ['batch', 'Batch cooking'], ['freezable', 'Congelable'], ['favorite', 'Favoris'], ['mine', 'Adaptées à moi'],
] as const;

export function RecipesView() {
  const p = useProfile();
  const { recipePrefs, priceOverrides } = useApp();
  const [cat, setCat] = useState<Recipe['category'] | 'all'>('all');
  const [tags, setTags] = useState<string[]>(['mine']);
  const [q, setQ] = useState('');
  const kcal = effectiveTargets(p).kcal;
  const prices = { ...content.prices, items: { ...content.prices.items, ...priceOverrides } };
  const list = useMemo(() => content.recipes.filter((r) => {
    if (cat !== 'all' && r.category !== cat) return false;
    if (q && !r.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    for (const t of tags) {
      if (t === 'favorite' && recipePrefs[r.id] !== 'favorite') return false;
      if (t === 'mine' && (!recipeAllowed(r, p) || recipePrefs[r.id] === 'excluded')) return false;
      if (t !== 'favorite' && t !== 'mine' && !r.tags.includes(t as never)) return false;
    }
    return true;
  }), [cat, tags, q, recipePrefs, p]);
  return (
    <>
      <TextInput value={q} onChangeText={setQ} placeholder="Chercher une recette" placeholderTextColor={colors.mute} accessibilityLabel="Chercher une recette"
        style={[typeScale.body, { color: colors.chalk, backgroundColor: colors.slate, borderRadius: radius.button, paddingHorizontal: 14, minHeight: 48 }]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {(['all', 'breakfast', 'main', 'snack'] as const).map((c) => (
          <Chip key={c} label={c === 'all' ? 'Toutes' : CATEGORY_FR[c]} selected={cat === c} onPress={() => setCat(c)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {FILTERS.map(([k, l]) => (
          <Chip key={k} label={l} selected={tags.includes(k)} onPress={() => setTags(tags.includes(k) ? tags.filter((x) => x !== k) : [...tags, k])} />
        ))}
      </View>
      <T v="caption" color={colors.mute}>{list.length} recette{list.length > 1 ? 's' : ''}</T>
      {list.map((r) => {
        const f = portionFactor(recipeMacros(r).kcal, kcal, SHARE[r.category]);
        const m = scaleMacros(recipeMacros(r), f);
        return (
          <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push(`/recette/${r.id}?f=${f}`)}>
            <Card style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.s }}>
                <T style={{ fontFamily: fonts.semibold, flex: 1 }}>{r.name}</T>
                {recipePrefs[r.id] === 'favorite' ? <T v="caption" color={colors.neon}>Favori</T> : null}
              </View>
              <T v="caption" color={colors.mute}>
                {CATEGORY_FR[r.category]} · {r.minutes} min · {num(m.kcal)} kcal · {m.protein} g prot. · ≈ {euros(recipeCost(r, f, prices))}
              </T>
            </Card>
          </Pressable>
        );
      })}
    </>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { addDays, effectiveTargets, fr, weeklyReview } from '@muscu/engine';
import { dayMonth, num } from '../../lib/format';
import { useApp, useProfile } from '../../store/AppState';
import { colors, space } from '../../theme';
import { Button } from '../Button';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { T } from '../Text';

const TREND = { down: 'en baisse', up: 'en hausse', same: 'stable', none: '—' } as const;

export function ReviewView() {
  const p = useProfile();
  const app = useApp();
  const [back, setBack] = useState(0);
  const r = weeklyReview(p, {
    exerciseLogs: app.exerciseLogs, sessions: app.sessions, food: app.food, weights: app.weights,
    supplements: app.supplements, life: app.life, checkIns: app.checkIns,
  }, addDays(app.today, -7 * back), app.today);
  const t = effectiveTargets(p);
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {[0, 1, 2, 3].map((k) => <Chip key={k} label={k === 0 ? 'Cette semaine' : k === 1 ? 'Semaine dernière' : `Il y a ${k} semaines`} selected={back === k} onPress={() => setBack(k)} />)}
      </View>
      <Card hero>
        <T v="label" color={colors.neon}>Bilan du {dayMonth(r.dates[0]!)} au {dayMonth(r.dates[6]!)}</T>
        <T v="title">{r.sessions.done} / {r.sessions.planned} séances</T>
        <T v="detail" color={colors.soft}>{r.liftedKg ? `${num(r.liftedKg)} kg soulevés` : 'Aucune série enregistrée'} · {r.records} record{r.records > 1 ? 's' : ''}</T>
      </Card>
      <Card>
        <T v="heading">Nutrition</T>
        <T v="detail" color={colors.soft}>
          {r.nutrition.daysLogged
            ? `${r.nutrition.daysLogged} jour${r.nutrition.daysLogged > 1 ? 's' : ''} noté${r.nutrition.daysLogged > 1 ? 's' : ''} : ${num(r.nutrition.avgKcal)} kcal en moyenne (objectif ${num(r.nutrition.kcalTarget)}) et ${r.nutrition.avgProtein} g de protéines (objectif ${r.nutrition.proteinTarget}).`
            : 'Aucun repas noté cette semaine.'}
        </T>
      </Card>
      <Card>
        <T v="heading">Poids et forme</T>
        <T v="detail" color={colors.soft}>
          {r.weight.last !== null
            ? `Poids : ${num(r.weight.last, 1)} kg${r.weight.changeSincePrevious !== null ? ` (${r.weight.changeSincePrevious >= 0 ? '+' : ''}${num(r.weight.changeSincePrevious, 1)} kg depuis la pesée précédente)` : ''}.`
            : 'Pas de pesée cette semaine.'}
        </T>
        <T v="detail" color={colors.mute}>
          {r.avgFeeling !== null ? `Ressenti moyen des séances : ${num(r.avgFeeling, 1)} sur 5.` : 'Aucun ressenti noté.'}
          {r.avgEnergy !== null ? ` Énergie au réveil : ${num(r.avgEnergy, 1)} sur 5.` : ''}
        </T>
      </Card>
      <Card>
        <T v="heading">Compléments et hygiène de vie</T>
        <T v="detail" color={colors.soft}>{r.supplementsRate !== null ? `Compléments pris : ${Math.round(r.supplementsRate * 100)} %.` : 'Aucun complément suivi.'}</T>
        <T v="detail" color={colors.soft}>
          Cigarettes : {r.life.current.cigarettes} ({TREND[r.life.cigarettes]}, semaine d’avant : {r.life.previous.cigarettes}) · Verres : {r.life.current.drinks} ({TREND[r.life.drinks]}, avant : {r.life.previous.drinks})
        </T>
      </Card>
      <Card style={{ borderWidth: r.calorieAdvice?.deltaKcal ? 2 : 0, borderColor: colors.neon }}>
        <T v="heading">Calories</T>
        {r.calorieAdvice ? (
          <>
            <T v="detail" color={colors.soft}>
              Ton poids varie de {r.calorieAdvice.slope >= 0 ? '+' : ''}{num(r.calorieAdvice.slope, 2)} kg par semaine (objectif {num(r.calorieAdvice.range[0], 2)} à {num(r.calorieAdvice.range[1], 2)}).
              {r.calorieAdvice.deltaKcal ? '' : ' Garde ton objectif.'}
            </T>
            {r.calorieAdvice.deltaKcal && back === 0 ? (
              <Button label={`${r.calorieAdvice.deltaKcal > 0 ? 'Ajouter' : 'Retirer'} 150 kcal (${num(t.kcal + r.calorieAdvice.deltaKcal)} kcal par jour)`}
                onPress={() => app.saveProfile({ ...p, kcalTarget: t.kcal + r.calorieAdvice!.deltaKcal })} />
            ) : null}
          </>
        ) : <T v="detail" color={colors.mute}>Pèse-toi chaque semaine pendant au moins 2 semaines pour un conseil d’ajustement.</T>}
      </Card>
      <Card>
        <T v="heading">À retenir</T>
        {r.tips.length ? r.tips.map((tip, i) => <T key={i} v="detail" color={colors.soft}>• {fr.tipText(tip)}</T>)
          : <T v="detail" color={colors.mute}>Continue à noter tes séances et tes repas : le bilan se complète au fil de la semaine.</T>}
      </Card>
    </>
  );
}

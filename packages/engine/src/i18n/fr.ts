// Textes français des codes renvoyés par le moteur. L'anglais suivra (en.ts) avec les mêmes clés.
import type { BudgetTip } from '../shopping';
import type { Tip } from '../review';
import type { SuggestionReason } from '../training';

export const sessionLabels: Record<string, string> = {
  session1: 'Séance 1', session2: 'Séance 2',
  upper: 'Haut', lower: 'Bas', fullBody: 'Complet',
  upperA: 'Haut A', lowerA: 'Bas A', upperB: 'Haut B', lowerB: 'Bas B',
  endurance: 'Endurance', intervals: 'Fractionné', bikeStrength: 'Vélo + renfo', circuit: 'Circuit',
  mobility: 'Récup', walk: 'Marche', rest: 'Repos',
};

export const mealSlots = ['Matin', 'Midi', 'Collation', 'Soir'];

export function tipText(t: Tip): string {
  switch (t.code) {
    case 'allSessionsDone': return 'Toutes tes séances sont faites : bravo.';
    case 'missingSessions': return `Il te manque ${t.n} séance${t.n > 1 ? 's' : ''} : place-la dans ton calendrier.`;
    case 'eatMore': return 'Tu manges en dessous de ton objectif : ajoute une collation ou une portion de féculents.';
    case 'proteinLow': return 'Tes protéines sont basses : œufs, fromage blanc, thon ou une dose de whey.';
    case 'tired': return 'Tu te sens fatigué : dors plus et allège une séance si besoin.';
    case 'smokingDown': return 'Tu fumes moins que la semaine d’avant : continue comme ça.';
    case 'smokingUp': return 'Tu as plus fumé que la semaine d’avant : fixe-toi un petit objectif pour la prochaine.';
    case 'alcoholDown': return 'Moins d’alcool que la semaine d’avant : très bien pour ta récupération.';
    case 'records': return `${t.n} record${t.n > 1 ? 's' : ''} cette semaine.`;
  }
}

export const budgetTips: Record<BudgetTip, string> = {
  dropSnackTwoDays: 'Retire une collation deux jours par semaine.',
  lowerTarget150: 'Baisse ton objectif de 150 kcal.',
  switchToBudgetMode: 'Passe en menus « budget serré ».',
  buyBulk: 'Achète riz, pâtes et lentilles en grand format.',
};

export const suggestionText: Record<SuggestionReason, string> = {
  topOfRange: 'Haut de la fourchette atteint : on monte la charge.',
  allEasy: 'Tout était facile la dernière fois : on monte la charge.',
  repeat: 'Même charge que la dernière fois : vise une répétition de plus.',
  firstTime: 'Choisis une charge qui te laisse 3 à 4 répétitions en réserve.',
  free: 'Note ta durée et ta distance.',
};

export const lifestyle = {
  encouragement: 'Baisse un peu chaque semaine : c’est ce qui compte, pas la perfection.',
  heartWarning: 'La caféine et le tabac accélèrent le cœur : reste à la dose basse de caféine et évite les pré-workouts forts.',
  training: 'Pas de cigarette dans l’heure avant et après la séance. Évite l’alcool le soir d’une séance.',
  quitHelp: {
    FR: [
      { name: 'Tabac Info Service', phone: '39 89', url: 'https://www.tabac-info-service.fr', what: 'Aide gratuite pour arrêter de fumer, avec un tabacologue.' },
      { name: 'Alcool Info Service', phone: '0 980 980 930', url: 'https://www.alcool-info-service.fr', what: 'Écoute anonyme et gratuite sur l’alcool, 7 jours sur 7.' },
    ],
  },
};

/** Message bienveillant selon la tendance de la semaine. */
export function lifeMessage(kind: 'cigarettes' | 'drinks', t: 'down' | 'up' | 'same' | 'none', current: number, previous = -1): string {
  if (previous === 0 && current > 0) return 'Première semaine notée : continue chaque jour, tu verras ta tendance la semaine prochaine.';
  if (kind === 'cigarettes') {
    if (t === 'none') return 'Aucune cigarette notée ces deux dernières semaines.';
    if (t === 'down') return `${current} cette semaine, moins que la semaine d’avant : ton souffle te dira merci.`;
    if (t === 'up') return 'Un peu plus que la semaine d’avant. Fixe-toi un petit objectif : une cigarette de moins par jour.';
    return 'Stable par rapport à la semaine d’avant. Essaie de supprimer celle de l’heure qui suit la séance.';
  }
  if (t === 'none') return 'Aucun verre noté ces deux dernières semaines.';
  if (t === 'down') return 'Moins d’alcool que la semaine d’avant : très bien pour ta récupération et ton sommeil.';
  if (t === 'up') return 'Un peu plus que la semaine d’avant. Garde au moins 2 à 3 jours sans alcool par semaine.';
  return 'Stable par rapport à la semaine d’avant.';
}

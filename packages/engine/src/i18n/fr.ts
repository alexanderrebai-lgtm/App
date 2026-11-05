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
  heartWarning: 'La caféine et le tabac accélèrent le cœur : reste à la dose basse de caféine.',
  quitHelp: { FR: { name: 'Tabac Info Service', phone: '39 89', url: 'https://www.tabac-info-service.fr' } },
};

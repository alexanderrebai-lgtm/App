// Projet Supabase d'Élan (région UE, Francfort). L'adresse et la clé « publishable » sont publiques
// par conception : elles sont incluses dans chaque appli installée, et la sécurité repose sur les
// règles RLS (docs/supabase/schema.sql). Aucune clé secrète n'est dans le dépôt.
// Pour viser un autre projet : EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans apps/mobile/.env.
const DEFAULT_URL = 'https://omhyjahxhblzifwhuqhx.supabase.co';
const DEFAULT_KEY = 'sb_publishable_kEe72XVFwwG8vFoiOAimgA_PjSmyzuK';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;
export const syncConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Vrai quand le projet envoie les codes à 6 chiffres par e-mail (service SMTP branché et modèle d'e-mail
 * avec {{ .Token }}). Sur l'offre gratuite sans SMTP, Supabase envoie un lien au lieu d'un code.
 */
export const emailCodeReady = true;

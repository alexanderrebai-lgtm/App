// Adresse et clé publique du projet Supabase (région UE), lues au moment de la compilation.
// La clé « anon » est publique par conception : la sécurité repose sur les règles RLS (docs/supabase/schema.sql).
// Aucune valeur n'est versionnée : elles se placent dans apps/mobile/.env (ignoré par git).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const syncConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

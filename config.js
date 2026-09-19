/* Les deux coordonnées du projet Supabase.
   La clé « anon » est faite pour être publique : elle n'ouvre rien par
   elle-même, ce sont les règles RLS du schéma qui gardent la porte.
   La clé « service_role », elle, ne doit JAMAIS figurer ici — elle ne sert
   qu'au script de reversement, sur le poste de Mickaël. */
window.CONFIG = {
  url: "A_REMPLIR",   // https://xxxxxxxxxxxx.supabase.co
  cle: "A_REMPLIR"    // la clé « anon public »
};

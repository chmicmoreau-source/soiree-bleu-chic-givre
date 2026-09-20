/* Les deux coordonnées du projet Supabase.
   La clé « anon » est faite pour être publique : elle n'ouvre rien par
   elle-même, ce sont les règles RLS du schéma qui gardent la porte.
   La clé « service_role », elle, ne doit JAMAIS figurer ici — elle ne sert
   qu'au script de reversement, sur le poste de Mickaël. */
window.CONFIG = {
  url: "https://klwbvyhovhbxmvzmxkyh.supabase.co",   // https://xxxxxxxxxxxx.supabase.co
  cle: "sb_publishable_Eims3h2g-JVwIXjlwW2HgQ_wz3-G64a"    // la clé « anon public »
};

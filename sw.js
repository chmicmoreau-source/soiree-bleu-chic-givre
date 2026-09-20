/* Le cache d'application, pour que la page s'ouvre même sans réseau.

   Stratégie : le réseau d'abord, le cache en secours. C'est l'inverse de ce
   qu'on lit souvent, et c'est voulu — une page de suivi qui affiche de vieux
   chiffres est pire qu'une page qui met une seconde de plus. Le cache ne sert
   qu'au moment où il n'y a plus rien : la salle des fêtes le soir venu.

   Les appels à Supabase ne passent jamais par ici : ce sont des données, pas
   des fichiers, et la page a sa propre file d'attente pour les tenir. */

var CACHE = "givre";
var SOCLE = [
  "index.html",
  "pointage.html",
  "ma-mission.html",
  "config.js",
  "acces.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        // un fichier manquant ne doit pas faire échouer toute l'installation
        return Promise.all(SOCLE.map(function (u) {
          return c.add(u).catch(function () { return null; });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(noms.filter(function (n) { return n !== CACHE; })
                              .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") { return; }
  var u;
  try { u = new URL(e.request.url); } catch (err) { return; }
  // les données restent l'affaire de la page, jamais du cache
  if (u.hostname.indexOf("supabase") >= 0) { return; }

  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r && r.ok) {
        var copie = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copie); })
          .catch(function () { /* quota, mode privé : on s'en passe */ });
      }
      return r;
    }).catch(function () {
      // ignoreSearch : « acces.js?v=202609201234 » doit retrouver « acces.js »
      return caches.match(e.request, { ignoreSearch: true }).then(function (c) {
        return c || Response.error();
      });
    })
  );
});

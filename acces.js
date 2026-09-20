/* Soirée « Bleu, Chic & Givré » — la porte et la feuille partagée.

   Ce fichier fait trois choses, dans cet ordre :

     1. il garde la porte : personne n'entre sans un lien reçu par mail, et
        seules les adresses inscrites dans la table « organisateurs » voient
        quelque chose ;
     2. il charge les données du classeur depuis la base et les pose dans
        DONNEES, exactement sous la forme que la page attendait quand elles
        étaient écrites en dur dedans ;
     3. il présente Supabase sous les traits de l'ancienne feuille partagée,
        pour que tout le code de la page continue de fonctionner sans être
        réécrit : même « collection », même « doc().set() », même
        « onSnapshot() ».

   Le point 3 explique le faux objet « claude » plus bas. Ce n'est pas une
   ruse : c'est le contrat qu'attend le reste de la page, et le tenir coûte
   trente lignes au lieu d'une réécriture. */

(function () {
  "use strict";

  var sb = null;
  var moi = null;          // l'adresse de la personne connectée
  var monNom = null;

  function $(id) { return document.getElementById(id); }

  function dire(texte, genre) {
    var e = $("porte-mot");
    if (!e) { return; }
    e.textContent = texte;
    e.className = "porte-mot" + (genre ? " " + genre : "");
  }

  function fermerLaPorte() { $("porte").hidden = true; }

  /* ------------------------------------------------------------ la porte */

  function montrerConnexion(prefill) {
    $("porte").hidden = false;
    $("porte-forme").hidden = false;
    $("porte-attente").hidden = true;
    if (prefill) { $("porte-mail").value = prefill; }
    $("porte-mail").focus();
  }

  function envoyerLeLien(e) {
    e.preventDefault();
    var mail = $("porte-mail").value.trim().toLowerCase();
    if (!mail) { return; }
    var b = $("porte-ok");
    b.disabled = true;
    dire("Envoi du lien…", "");
    sb.auth.signInWithOtp({
      email: mail,
      options: { emailRedirectTo: window.location.href.split("#")[0] }
    }).then(function (r) {
      b.disabled = false;
      if (r.error) {
        dire("L'envoi a échoué : " + r.error.message, "raté");
        return;
      }
      $("porte-forme").hidden = true;
      $("porte-attente").hidden = false;
      $("porte-adresse").textContent = mail;
      dire("", "");
    }).catch(function () {
      b.disabled = false;
      dire("L'envoi a échoué. Réessaie dans un instant.", "raté");
    });
  }

  /* --------------------------------------- la feuille partagée, revisitée */

  var laFeuille = null;   // une seule, jamais deux : voir plus bas

  /** Rend un objet qui parle comme l'ancienne feuille partagée de Claude.
      Elle n'est construite qu'une fois. Un second appel rouvrirait le canal
      temps réel sous le même nom, et Supabase refuse d'ajouter un écouteur à
      un canal déjà souscrit — c'est ce qui cassait la page au retour du lien
      reçu par mail. */
  function feuillePartagee() {
    if (laFeuille) { return laFeuille; }

    var abonnes = {};   // collection -> fonctions à prévenir
    var cache = {};     // collection -> { id: contenu }

    function pousser(col) {
      var m = cache[col] || {};
      var snap = {
        docs: Object.keys(m).map(function (id) {
          return { id: id, data: function () { return m[id]; } };
        })
      };
      (abonnes[col] || []).forEach(function (f) { f(snap); });
    }

    function charger(col) {
      return sb.from("docs").select("id,contenu").eq("collection", col)
        .then(function (r) {
          if (r.error) { throw r.error; }
          var m = {};
          (r.data || []).forEach(function (x) { m[x.id] = x.contenu || {}; });
          cache[col] = m;
          pousser(col);
        });
    }

    function ecrire(col, id, corps) {
      // L'écho local d'abord : la case cochée ne doit pas attendre le réseau.
      cache[col] = cache[col] || {};
      cache[col][id] = corps;
      pousser(col);
      return sb.from("docs").upsert({
        collection: col, id: id, contenu: corps,
        maj: new Date().toISOString(), par_qui: moi
      }).then(function (r) {
        if (r.error) {
          var e = new Error(r.error.message);
          // 42501 = la règle RLS a refusé. La page sait déjà quoi en faire.
          e.code = (r.error.code === "42501") ? "invalid_argument" : r.error.code;
          throw e;
        }
      });
    }

    // Un seul canal pour toute la table : Supabase ne filtre pas par
    // collection côté serveur sans index dédié, et le volume est dérisoire.
    sb.channel("docs-en-direct")
      .on("postgres_changes",
          { event: "*", schema: "public", table: "docs" },
          function (p) {
            var r = p.new && p.new.collection ? p.new : p.old;
            if (!r || !cache[r.collection]) { return; }
            if (p.eventType === "DELETE") { delete cache[r.collection][r.id]; }
            else { cache[r.collection][r.id] = p.new.contenu || {}; }
            pousser(r.collection);
          })
      .subscribe();

    laFeuille = {
      collection: function (col) {
        return {
          doc: function (id) {
            return { set: function (corps) { return ecrire(col, id, corps); } };
          },
          add: function (corps) {
            var id = (window.crypto && window.crypto.randomUUID)
              ? window.crypto.randomUUID()
              : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
            return ecrire(col, id, corps).then(function () { return { id: id }; });
          },
          onSnapshot: function (cb, sur) {
            (abonnes[col] = abonnes[col] || []).push(cb);
            charger(col).catch(function (e) { if (sur) { sur(e); } });
          }
        };
      }
    };
    return laFeuille;
  }

  /* ------------------------------------------------- les données à l'entrée */

  function chargerDonnees() {
    return Promise.all([
      sb.from("docs").select("contenu").eq("collection", "reglages").eq("id", "tout"),
      sb.from("docs").select("contenu").eq("collection", "classeur")
    ]).then(function (res) {
      if (res[0].error) { throw res[0].error; }
      if (res[1].error) { throw res[1].error; }
      var reg = (res[0].data && res[0].data[0] && res[0].data[0].contenu) || null;
      if (!reg) {
        throw new Error("La base est vide : le classeur n'y a pas encore été versé.");
      }
      var invites = (res[1].data || []).map(function (x) { return x.contenu; });
      invites.sort(function (a, b) { return (a.ligne || 0) - (b.ligne || 0); });
      var D = {};
      Object.keys(reg).forEach(function (k) { D[k] = reg[k]; });
      D.invites = invites;
      window.DONNEES = D;
    });
  }

  /* ------------------------------------------------------------ l'entrée */

  var entree = false;
  var lance = false;

  /** Au retour du lien reçu par mail, la session arrive par deux chemins à la
      fois : getSession() la trouve, et onAuthStateChange annonce SIGNED_IN.
      Sans ce verrou la page se lance deux fois, et le second passage vient
      recouvrir d'une erreur celui qui avait réussi. */
  function entrer(session) {
    if (entree) { return Promise.resolve(); }
    entree = true;
    moi = (session.user.email || "").toLowerCase();
    return sb.from("organisateurs").select("nom").eq("email", moi)
      .then(function (r) {
        if (r.error) { throw r.error; }
        if (!r.data || !r.data.length) {
          $("porte-forme").hidden = true;
          $("porte-attente").hidden = true;
          $("porte-refus").hidden = false;
          $("porte-refus-mail").textContent = moi;
          $("porte").hidden = false;
          return null;
        }
        monNom = r.data[0].nom;
        return chargerDonnees().then(function () {
          window.claude = {
            use: function (nom) {
              return Promise.resolve(nom === "db" ? feuillePartagee() : null);
            }
          };
          $("moi-nom").textContent = monNom;
          $("moi").hidden = false;
          fermerLaPorte();
          lance = true;
          window.demarrer();
        });
      })
      .catch(function (e) {
        // Une fois la page lancée, on ne la recouvre plus : le souci se dit
        // dans le bandeau, sinon on effacerait un écran qui marchait.
        var mot = "Impossible de charger les données : " + (e.message || e);
        if (lance) {
          var bande = $("etat-saisie");
          if (bande) { bande.className = "etat-saisie mort"; bande.textContent = mot; }
          return;
        }
        dire(mot, "raté");
        $("porte").hidden = false;
      });
  }

  /* --------------------------------------------------------------- départ */

  function demarrage() {
    if (!window.CONFIG || window.CONFIG.url === "A_REMPLIR") {
      $("porte").hidden = false;
      $("porte-forme").hidden = true;
      dire("Le site n'est pas encore relié à sa base : il manque l'adresse et la "
         + "clé dans config.js.", "raté");
      return;
    }
    sb = window.supabase.createClient(window.CONFIG.url, window.CONFIG.cle, {
      auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });

    $("porte-forme").addEventListener("submit", envoyerLeLien);
    $("deconnexion").addEventListener("click", function () {
      sb.auth.signOut().then(function () { window.location.reload(); });
    });

    sb.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (s) { entrer(s); } else { montrerConnexion(""); }
    });

    sb.auth.onAuthStateChange(function (evt, s) {
      // « entrer » se garde lui-même de partir deux fois.
      if ((evt === "SIGNED_IN" || evt === "INITIAL_SESSION") && s) { entrer(s); }
      if (evt === "SIGNED_OUT") { window.location.reload(); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarrage);
  } else {
    demarrage();
  }
})();

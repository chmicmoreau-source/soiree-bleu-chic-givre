# Bleu, Chic & Givré — espace des organisateurs

Page de suivi d'une soirée entre amis : compte à rebours, avancement des
réponses et des règlements, répartition du buffet, et les points encore à
trancher.

**Ce dépôt ne contient aucune donnée.** Pas de liste d'invités, pas de
montants, pas de coordonnées. Tout cela vit dans une base Supabase, derrière
une connexion par lien envoyé par mail, et n'est chargé qu'une fois la
personne reconnue comme membre de l'équipe. Le fichier publié ici n'est qu'une
coquille : structure, styles et code de rendu.

## Les fichiers

| | |
|---|---|
| `index.html` | la page entière — structure, styles, rendu |
| `acces.js` | la connexion par mail, le chargement des données, la feuille partagée |
| `config.js` | l'adresse du projet Supabase et sa clé publique |

La clé `anon` de `config.js` est faite pour être publique : elle n'ouvre rien
par elle-même. Ce sont les règles d'accès de la base (RLS) qui gardent la
porte, et elles n'accordent rien à une adresse absente de la table des
organisateurs.

## Mise à jour

La page est engendrée à partir du tableau de bord local, puis alimentée depuis
le classeur de gestion. Les deux commandes vivent hors de ce dépôt :

```
py construire_site.py      # reconstruit index.html
py sync_site.py les-deux   # reverse les saisies, puis rafraîchit depuis le classeur
```

\# TTFL App



Appli mobile de la chaîne TTFL : pick du soir, historique, stats, absents.

Next.js 16, Supabase Auth + RLS, PWA. Ne calcule rien elle-même : elle

affiche ce que le moteur Python (C:\\Users\\lolor\\Projets\\ttfl) a déjà

poussé dans Supabase.



\## Commandes



\- npm run dev

\- npm run build

\- npm run lint (ESLint flat, eslint.config.mjs)

\- npm test (Vitest, dossier tests/)



\## Où est quoi



\- app/(app)/ : pages protégées (accueil, ce-soir, picks, stats, absents)

\- app/login/ : connexion

\- lib/supabase/ : clients Supabase (server.ts = serveur, client.ts = navigateur)



\## Règles



\- Ne jamais recalculer un pick ou une stat ici : lecture seule depuis Supabase.

\- Next 16 : cookies()/headers() sont async (voir lib/supabase/server.ts, createClient() est async). searchParams aussi (voir app/(app)/picks et stats).

\- lib/supabase/client.ts, components/RealtimeRuns.tsx et components/NewRunNotifier.tsx utilisent le client NAVIGATEUR : toujours synchrone, ne jamais y ajouter await sur les cookies.

\- La clé service-role Supabase ne doit jamais apparaître dans ce projet (app grand public, pas de service-role côté client).



\## Je suis débutant



\- Réponds-moi toujours en français.

\- Demande avant toute suppression de fichier.




\## En attente (à rappeler à l'utilisateur quand ça se débloque)



\- Graphique du classement sur la saison : le classement n'est dans aucune table Supabase. Il faut d'abord que le moteur (ttfl/pont/push_to_supabase.py) le pousse. La courbe du score existe déjà (Stats > Progression).

\- Avis de l'agent IA sous le pick du soir (PickCard) : à faire une fois les bugs du projet Agents IA (mes-agents) corrigés.

\- Décidé : pas de Web Push (notification app fermée), la version actuelle suffit.
- Centre de surveillance TTFL (https://fantasy.trashtalk.co/?tpl=followers) : noter et garder en mémoire les picks validés par des joueurs suivis. À cadrer plus tard (l'utilisateur dit « on verra ce qu'on en fera »).
- Matchup à ×1.00 en début de saison (table défense/poste vide) : TESTÉ le 15/10/2026 (ttfl : recherche/matchup_saison_precedente.py, 4 saisons, 33 variantes) → pas de gain démontré avec la saison précédente, le rythme ou le profil statistique ; l'historique contre l'adversaire DEGRADE le classement. Seule piste à surveiller : mélange saison précédente/courante K=20, poids 0.6 (+0.1 pt/soirée sur le top 10, non significatif). Rien à activer.
- Stats : grande partie « Adversaires » à définir avec l'utilisateur.


## Mise à jour 2026-10-23
- Onglet Vainqueurs : un changement de choix est envoyé chez Thomas par le moteur cloud sous 2 à 4 minutes ; l'app affiche « Envoi chez Thomas en cours » tant que `maj_le` du choix est plus récent que celui de KT.
- Onglet Admin > Cookies : suivi de l'âge des cookies et renouvellement depuis l'app (`lib/cookies.ts`, `lib/github-secrets.ts`, `app/(app)/admin/cookies-actions.ts`). Nécessite la variable Vercel `GITHUB_SECRETS_TOKEN` (jeton GitHub fin, accès Secrets en lecture/écriture sur `ttfl-auto`). `libsodium-wrappers` est listé dans `serverExternalPackages` (next.config.mjs).
- Tests : `NODE_ENV=test npx vitest run`, `npx tsc --noEmit`, `npx eslint .` (CI GitHub `tests.yml`, seulement quand le code change). Les tests libsodium/GitHub doivent rester en environnement node (`// @vitest-environment node`).
- Supabase partagé avec d'autres apps : ne jamais exposer une table à tout le rôle authenticated ; politiques propriétaire (uid `fd0b91ef-…`).
- Ne jamais afficher ni journaliser le joueur du compte 02 tant que sa soirée est secrète.


## Onglet « Mode op. » (23/10/2026)
- Page `/mode-operatoire` (7e onglet de `components/BottomNav.tsx`) : fiches « pour quoi faire / quand / étapes / à retenir » pour chaque procédure importante.
- TOUT le contenu est dans UN fichier : `lib/modes-operatoires.ts` (`MODES`, `SECTIONS`). Pour modifier ou ajouter une fiche : éditer ce fichier, mettre à jour `misAJour`, lancer les tests (`tests/modes-operatoires.test.tsx` vérifie fiches complètes, ancres uniques, aucun secret, aucun Telegram), publier. Ne jamais y mettre de cookie, clé, jeton, ni le joueur d'un pick secret.
- Quand une procédure change dans l'app (Admin, cookies, notifications, mode cloud...), mettre la fiche correspondante à jour dans la même modification.
- Telegram est abandonné définitivement par l'utilisateur : ne jamais le proposer.

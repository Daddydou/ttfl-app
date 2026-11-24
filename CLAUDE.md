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
- Page `/mode-operatoire` (rangée dans l'onglet « Plus », `app/(app)/plus/page.tsx`) : fiches « pour quoi faire / quand / étapes / à retenir » pour chaque procédure importante.
- TOUT le contenu est dans UN fichier : `lib/modes-operatoires.ts` (`MODES`, `SECTIONS`). Pour modifier ou ajouter une fiche : éditer ce fichier, mettre à jour `misAJour`, lancer les tests (`tests/modes-operatoires.test.tsx` vérifie fiches complètes, ancres uniques, aucun secret, aucun Telegram), publier. Ne jamais y mettre de cookie, clé, jeton, ni le joueur d'un pick secret.
- Quand une procédure change dans l'app (Admin, cookies, notifications, mode cloud...), mettre la fiche correspondante à jour dans la même modification.
- Telegram est abandonné définitivement par l'utilisateur : ne jamais le proposer.

## Rapidité (24/10/2026)
- `vercel.json` : fonctions en région `dub1` (Dublin), à côté de la base Supabase (eu-west-1). Avant : `iad1` (Washington) = un aller-retour transatlantique par requête. Ne pas remettre une autre région.
- `lib/supabase/middleware.ts` : `getClaims()` (vérification locale du jeton, clés ES256 du projet) à la place de `getUser()` (appel réseau à chaque page). Si les clés de signature du projet Supabase repassent en secret partagé, `getClaims()` retombe tout seul sur un appel réseau.
- Règle pour les pages : toute requête indépendante va dans un `Promise.all` (jamais d'`await` à la suite) ; ce qui n'est pas nécessaire au premier affichage va dans un `<Suspense>` (ex. badge de mode de `app/(app)/layout.tsx`).
- « Toi vs les repères » (`lib/benchmarks.ts`) compare à soirées égales : seules les soirées où le compte 01 ET le repère ont un score comptent.

## Navigation (24/10/2026)
- 5 onglets (`components/BottomNav.tsx`) : Accueil, Conseillés, Mes picks, Vainqueurs, Plus. « Plus » (`app/(app)/plus/page.tsx`) range Stats, Stars, Adversaires, Absents, Semaine équipe, Admin, Mode op. Une nouvelle page rare va dans « Plus », pas dans la barre.
- Admin = aperçu (état du moteur + santé) + sous-pages `/admin/{actions,journal,envois,secret,cloud,masse,notifications,cookies}`. Une action serveur Admin invalide `revalidatePath("/admin", "layout")`.
- Les sous-pages ont un retour en haut à gauche : `PageHeader retour={{ href, libelle }}`.
- Le dernier compte choisi (Conseillés `?pour=`, Mes picks `?zone=`) est retenu dans le cookie `ttfl_zone` (proxy, `lib/planning.ts` + `lib/zone-memo.ts`).
- Accent (jaune balle depuis la refonte Dark) = action ou sélection uniquement (DESIGN.md) : jamais pour un chiffre, un graphique ou un statut.

## Refonte « Dark » (16/11/2026)
- Même thème et mêmes effets que l'app Tennis (refonte « esprit Dark ») : voir DESIGN.md. Toujours sombre, jetons `--c-*` dans `app/globals.css`, polices Inter + Jost (titres en capitales espacées).
- Composants dans `components/dark/` : FondVivant (fibres), IntroOuverture, MenuTiroir (☰), Entonnoir (transition depuis le point touché, branchée dans `app/(app)/template.tsx`), TerrainDessine, SceneAccueil. `lib/origine-entonnoir.ts` retient le point de départ.
- Accent réglable dans ☰ > Apparence (balle par défaut, or, ballon) : `localStorage.ttfl-accent`, lu avant l'affichage dans `app/layout.tsx`.
- Une nouvelle page s'ajoute au menu tiroir (`components/dark/MenuTiroir.tsx`) ET à « Plus ».
- Le squelette `app/(app)/loading.tsx` doit garder `aria-busy="true"` (l'Entonnoir attend sa disparition).


## x2 (06/11/2026)
- Admin → x2 (`app/(app)/admin/x2/page.tsx`, `lib/x2.ts`, `x2-actions.ts`, composants `ReglageX2`, `PoserX2`, `GrilleX2`) : interrupteur (off | à blanc | réel + comptes cochés), pose à la main sur un pick existant, retrait, vue des 6 mois par compte. Tables `ttfl_x2`, `ttfl_x2_reglage` (RLS propriétaire). La pose/retrait réels sont faits par le robot (ttfl-auto), pas par l'app.
- Pick secret : le x2 d'une soirée secrète du compte 02 est affiché « 🔒 secret » et les actions sont refusées (`refusSecret`).
- Badge « ×2 » partout où un pick est affiché : `components/BadgeX2.tsx` + `lib/x2-affichage.ts` (`lireLignesX2` dans le `Promise.all` de la page, `construireCarteX2` avec le secret, `x2Pour(carte, compte, date, joueur)`). Le badge suit le JOUEUR (nom normalisé) ; pleine = `pose`, pointillés = `voulu` ; rien pour `a_retirer` / `annule_site` / `echec` ni pour le 02 d'une soirée secrète. Tout nouvel écran qui montre un pick doit l'ajouter. Tests : `tests/x2-affichage.test.tsx`.
- Fiche « Mode op. » : `x2` (lib/modes-operatoires.ts). Tests : `tests/x2-lib.test.ts`.


## Questionable (18/11/2026)
- Pastille « Q » à côté d'un joueur Questionable, partout où un pick est affiché : `components/BadgeQuestionable.tsx` + `lib/questionables.ts` (`lireQuestionables` : dernier statut de `ttfl_blesses_historique` pour ce soir et les 3 soirées suivantes ; `QuestionablesProvider` dans `app/(app)/layout.tsx`, chaque pastille lit dans son `<Suspense>`). Tout nouvel écran qui montre un pick doit l'ajouter (comme le badge ×2). Jamais l'accent (réservé aux actions).
- Exemption à la pose : `noterGardesQuestionable` dans `app/actions.ts` (pickPlayer, pickPlayerComptes, pickRepartition, retirerPickComptes) écrit/efface `ttfl_garde_questionable` ; erreur ignorée. Tests : `tests/badge-questionable.test.tsx`, `tests/garde-questionable-actions.test.ts`.
- Fiche « Mode op. » : `questionable` (lib/modes-operatoires.ts). Règle et interrupteur côté moteur : voir `ttfl/CLAUDE.md`.

## Photos des joueurs (18/11/2026)
- Visages = photos LIBRES de Wikimedia Commons (via Wikidata), initiales quand il n'y en a pas. Aucune photo n'est telechargee ni stockee : `lib/visages-data.json` garde seulement l'URL de la miniature, l'auteur, la licence et la page Commons. Le navigateur charge la miniature chez Wikimedia ; en cas d'echec, `components/Visage.tsx` retombe sur les initiales.
- REGLE : partout ou un nom de joueur est affiche (pick, plan, conseille, absent...), ajouter `<Visage nom={...} />` (`lib/visages.ts` : `visageDe`, `initiales`). Ne jamais afficher un joueur secret du compte 02 (le composant ne change rien a cette regle).
- Page `/credits-photos` (rangee dans Plus et le menu tiroir) : auteurs et licences, obligatoire pour l'attribution.
- Mise a jour (nouvelle recrue, nouveau joueur) : exporter les joueurs en CSV UTF-8 (`player,team`) puis `node scripts/visages-wikimedia.mjs joueurs.csv` (`--tout` pour tout refaire, `VISAGES_DETAIL=1` pour voir pourquoi un joueur n'a pas de photo). ATTENTION : un CSV mal encode (accents abimes) fait rater les etoiles (Doncic, Jokic...). Seules les licences libres sont gardees (CC BY, CC BY-SA, CC0, domaine public).

## Récap de la nuit (18/11/2026)
- Accueil : carte « Top 30 de la nuit » (`components/RecapNuit.tsx`, `lib/recap-nuit.ts`, bloc `RecapNuitBlock` dans `app/(app)/page.tsx`, en `<Suspense>`). Elle lit la table `ttfl_resultats_nuit` (une ligne par joueur et par soirée NY, politique propriétaire) : l'app ne calcule aucun score.
- Cette table est remplie par le moteur : `ttfl/pont/resultats_nuit.py`, appelé par `pont.archiver_resultats` (tâche matin, 9 h 40). Rattrapage de toute la saison : `python -m pont.archiver_resultats --rattrapage` (une fois, sans doublon). Migration : `ttfl/pont/migration_resultats_nuit.sql` (appliquée le 18/11).
- Le pick du compte 01 de la soirée est mis en évidence (ou rappelé sous la liste s'il est hors du top 30). Les autres comptes ne sont pas montrés ici.
## x2 posable partout où on pose un joueur (23/11/2026)
- Logique serveur commune : `lib/x2-pose.ts` (`chargerLignesX2`, `verifierX2`, `ecrireX2`), utilisée par `poserX2` / `poserX2Comptes` (`app/(app)/admin/x2-actions.ts`) et par `pickPlayerComptes(…, avecX2)`, `verrouillerPickManuel(…, avecX2)`, `pickRepartition(…, x2Comptes)` (`app/actions.ts`). Le x2 est VÉRIFIÉ AVANT d'écrire le pick : refusé = aucun pick enregistré.
- Écrans : `components/CaseX2.tsx` (case « Poser aussi le x2 » dans PickZoneButton, NuitPicker, Plan 30 « Valider à la main »), case par groupe dans RepartitionEquipe, `components/BoutonX2Pick.tsx` (bouton « ×2 » en deux appuis sur un pick déjà posé : « Pické », « Changer »). Tout nouvel écran qui pose ou modifie un joueur doit proposer la même case. `x2Possible(date, aujourdhui)` (lib/x2.ts) masque la case hors novembre → avril ou pour une soirée passée.
- Tests : `tests/x2-pose.test.ts` (serveur), `tests/x2-ecrans.test.tsx` (écrans). Fiche « Mode op. » `x2` mise à jour.

## Adversaires : joueurs reprenables sous 7 jours (23-24/11/2026)
- Page `app/(app)/adversaires/page.tsx` : pour chaque adversaire suivi (table `ttfl_suivis`, `suivi = true`), liste des joueurs du TOP 30 de nos projections de chaque soirée (7 prochains jours, `NB_JOURS`) qu'il peut encore prendre, rangés par première date possible. En dépliant un adversaire on ne voit que les JOURS (repliés) ; chaque jour se déplie pour montrer ses joueurs (`<details>` imbriqués, test `tests/reprises-adversaire-affichage.test.tsx`). Un joueur qu'il a pické à 30 jours ou moins (avant ou après la date, règle du site) est exclu. Les « derniers picks » ne sont plus affichés (ils servent seulement au calcul).
- Fichiers : `lib/adversaires-reprises.ts` (logique pure : `topDeLaNuit`, `reprisesAdversaires`, `grouperParDate`), `lib/adversaires-reprises-data.ts` (`chargerTopNuits`, mêmes runs que Conseillés, blessés Out et absents saisis retirés), `components/ReprisesAdversaire.tsx`. Tests : `tests/adversaires-reprises.test.ts`, `tests/adversaires.test.tsx`, `tests/adversaires-scores.test.tsx`.
- Bug d'affichage corrigé : le site TTFL colle le score au nom (« Anthony Davis · 37 pts ») ; `nomJoueurSuivi` (`lib/adversaires.ts`) ne garde que le nom. À utiliser partout où l'on lit `ttfl_suivis_picks.joueur` (déjà fait dans `lib/stats-adversaires.ts`, `picksPopulaires`).
- Limite connue : on ne connaît que les picks DÉJÀ relevés (le site ne montre que le pick de la veille) ; le pick du soir même d'un adversaire est inconnu.

## Résumé x2 par compte (23/11/2026)
- Carte « x2 de <mois> » en haut de Mes picks (Planning + Historique, mode regular) : `components/X2DuMoisBlock.tsx` (serveur, dans un `<Suspense>`), `components/X2DuMois.tsx` (affichage), `lib/x2-resume.ts` (logique pure : `resumerX2`, `synthetiser`, `lireLignesResumeX2`). Lecture seule de `ttfl_x2` (tous les statuts, mois courant + suivant).
- États : valide (posé + soirée passée), pose_avenir, prevu (voulu, soirée à venir), non_pose (voulu mais soirée passée), retrait, echec, retire_main, secret (compte 02 soirée secrète : ni date ni joueur), aucun. Pas d'accent orange pour un statut (DESIGN.md). Tests : `tests/x2-resume.test.tsx`. Fiche « Mode op. » `x2` mise à jour.

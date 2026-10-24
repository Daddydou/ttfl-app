# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA installable, mobile-first, orientation portrait (`public/manifest`). Utilisée surtout depuis le téléphone en mode standalone.

## Users

Un seul utilisateur : le propriétaire, qui gère plusieurs comptes TTFL (compte 01, compte 02, et le compte de Thomas, alimenté automatiquement par le moteur cloud). Débutant en code, francophone ; toute l'interface est en français.

## Product Purpose

Afficher sur mobile ce que le moteur Python personnel (dépôt `ttfl`, poussé dans Supabase) a calculé : le pick conseillé du soir, sa fourchette de score, le Top 10, le plan sur 30 jours, les stats, les absents. L'app ne calcule rien elle-même ; elle lit, et écrit seulement en retour les picks validés, les scores réels et les absents.

Réussite : valider le bon pick à temps avant le lock, sans doute sur la fraîcheur des données, et suivre la saison de chaque compte.

## Positioning

Deux choses qu'aucune autre app TTFL ne peut offrir : les projections d'un moteur personnel (pick conseillé, fourchette mauvais soir / moyen / bon soir, chance de faire 40+), et le pilotage de plusieurs comptes TTFL depuis un seul endroit (dont l'envoi automatique chez Thomas).

## Operating Context

Quatre moments d'usage, tous réels :
- **Juste avant le lock** : sur le téléphone, vite ; écran « Ce soir », bandeau de fraîcheur, validation du pick.
- **Le lendemain** : saisie du score réel, consultation des stats.
- **Surveillance / admin** : fraîcheur des calculs, mode cloud, âge et renouvellement des cookies, envoi chez Thomas.
- **Analyse posée** : stats, adversaires, planning 30 jours, comparaison aux repères.

Le moteur pousse toutes les 30 min environ (16 h → 2 h, heure de Paris) ; l'accueil se rafraîchit en temps réel à chaque nouveau run. Onglet « Mode op. » : fiches de procédures pour les gestes importants.

## Capabilities and Constraints

- Next.js 16 (App Router), Tailwind 3, Supabase Auth + RLS, déployé sur Vercel (région `dub1`).
- Lecture seule pour tout pick ou stat : jamais de recalcul côté app.
- Règles TTFL : un joueur pické est bloqué 30 jours en saison régulière, usage unique en playoffs.
- Sécurité : jamais de clé service-role ; Supabase partagé avec d'autres apps, politiques propriétaire uniquement.
- Le joueur du compte 02 ne doit jamais être affiché ni journalisé tant que sa soirée est secrète.
- Pas de Web Push (décidé) ; Telegram abandonné définitivement.
- En attente : graphique du classement saison (donnée absente de Supabase), avis de l'agent IA sous le pick, partie « Adversaires » des stats à définir.

## Brand Commitments

Nom : « TTFL — Le pick du soir » (court : TTFL). Ton direct, tutoiement, français simple.

## Evidence on Hand

Données réelles issues du moteur dans Supabase (runs, projections, picks, scores, absents). Aucun témoignage, aucun autre utilisateur : ne rien inventer de ce côté.

## Product Principles

1. La donnée du moteur fait foi : l'app montre, elle n'invente ni ne recalcule.
2. Confiance avant tout : la fraîcheur et l'état des envois doivent se voir d'un coup d'œil.
3. Le pick du soir passe en premier ; il doit être actionnable en quelques secondes, à une main.
4. Plusieurs comptes, aucune confusion : toujours clair sur quel compte on agit.
5. Le secret reste secret : aucune fuite du pick du compte 02 avant l'heure.

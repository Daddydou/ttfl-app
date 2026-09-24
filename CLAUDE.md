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


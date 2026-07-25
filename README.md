# TTFL — Web App (partie 2/2)

Le pick TTFL du soir, **calculé sur le PC**, consulté sur **mobile**.
Cette app ne calcule rien : elle LIT les projections que `push_to_supabase.py`
(partie 1) pousse dans Supabase, et ÉCRIT en retour tes picks et tes absents.

```
  PC (moteur Python)  ─push→  Supabase  ─→  cette app (Vercel)
                              Supabase  ←─  picks validés, scores, absents
```

- **Next.js 14** (App Router) · **Tailwind** · **Supabase** (`@supabase/ssr`)
- **PWA** installable · **mobile-first** · réservée à un compte (Supabase Auth)
- Aucune clé de service côté client : uniquement la clé **anon**, protégée par le RLS.

---

## 🏀 Le rituel quotidien

1. **Le PC pousse** (tâche planifiée toutes les 30 min, 16 h → 2 h Paris — partie 1).
2. **Tu ouvres l'app sur ton téléphone** avant le lock. L'écran « Ce soir »
   montre le pick conseillé, un **bandeau de fraîcheur** (vert = calcul récent +
   report frais ; orange/rouge = vieillissant ou report non rafraîchi), et le
   Top 10.
3. **Tu valides ton pick** dans TTFL, puis tu tapes « J'ai pické X » → il part
   dans `ttfl_picks` (et bloque le joueur : cycle 30 j en régulière, usage unique
   en playoffs).
4. **Le lendemain**, tu saisis le **score réel** dans « Mes picks ». Il alimente
   tes stats.
5. Besoin d'exclure un joueur que l'injury report ne porte pas encore (repos
   annoncé…) ? Onglet **Absents** → il sera pris en compte au prochain calcul du PC.

L'accueil se **rafraîchit tout seul** quand le PC pousse un nouveau run (realtime).

---

## Écrans

| Onglet | Contenu |
|---|---|
| **Ce soir** | Pick conseillé en grand (⚡ + explication d'urgence en playoffs), bandeau de fraîcheur, Top 10 avec statut coloré, bouton « J'ai pické ». |
| **Mes picks** | Historique, saisie du score a posteriori, total & moyenne, compteur d'usage unique en playoffs. |
| **Stats** | Total, moyenne/pick, meilleur & pire, distribution par tranches, courbe de cumul, moyenne par tour (playoffs). |
| **Absents** | Absents en cours, ajout (joueur, dates, raison), retrait au retour du joueur. |

---

## Développement local

Prérequis : **Node 18+** (testé sur Node 24) et la partie 1 déjà en place
(tables `ttfl_*` créées, au moins un `push` effectué).

```bash
cd C:\Users\lolor\ttfl-app
npm install
cp .env.example .env.local   # puis renseigne les 2 valeurs (voir ci-dessous)
npm run dev                  # http://localhost:3000
```

### Variables d'environnement (`.env.local`)

Uniquement des valeurs **publiques** (clé anon / publishable, soumise au RLS) :

```
NEXT_PUBLIC_SUPABASE_URL=https://ubnkuwyqclrjckogldlc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

> Ne JAMAIS mettre ici la clé `service_role` / `sb_secret_` : elle contourne le
> RLS et reste sur le PC (partie 1).

---

## Créer le compte de connexion (une fois)

L'app est privée : il faut **un** utilisateur.

**Supabase → Authentication → Users → Add user** :
- Email + mot de passe
- ✅ coche **Auto Confirm User** (sinon tu ne pourras pas te connecter tout de suite)

C'est tout — le RLS (partie 1) donne à tout utilisateur authentifié l'accès
complet aux tables `ttfl_*`. Pour passer plus tard à plusieurs comptes, voir le
commentaire « multi-utilisateur » dans `supabase_schema.sql`.

---

## Activer le realtime (optionnel mais recommandé)

Pour que l'accueil se recharge tout seul à chaque push :

**Supabase → Database → Replication →** publication `supabase_realtime` →
ajoute la table **`ttfl_runs`**.

(ou en SQL : `alter publication supabase_realtime add table ttfl_runs;`)

Sans ça, l'app fonctionne toujours — il suffit de tirer pour rafraîchir.

---

## Déploiement Vercel

1. Pousse le repo sur GitHub (voir plus bas).
2. **vercel.com → Add New → Project →** importe `Daddydou/ttfl-app`.
   Next.js est détecté automatiquement (build `next build`, aucune config).
3. **Environment Variables** — ajoute les deux, pour *Production*, *Preview* et
   *Development* :

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://ubnkuwyqclrjckogldlc.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` |

4. **Deploy**. Une fois l'URL obtenue (ex. `ttfl-app.vercel.app`), ouvre-la sur
   ton téléphone → menu du navigateur → **« Sur l'écran d'accueil »** pour
   l'installer comme une app.

### Redirections d'auth

L'app utilise l'auth par cookies (email/mot de passe), sans lien de redirection
OAuth : il n'y a donc **rien à configurer** dans les URL de redirection Supabase
pour ce mode. (Si un jour tu ajoutes le magic-link ou un provider OAuth, pense à
ajouter l'URL Vercel dans **Authentication → URL Configuration**.)

---

## Pousser sur GitHub

Le repo est déjà initialisé localement (premier commit fait). Pour l'envoyer sur
`Daddydou/ttfl-app` :

```bash
# 1. Crée le repo vide sur github.com (Daddydou/ttfl-app), SANS README.
# 2. Puis :
cd C:\Users\lolor\ttfl-app
git remote add origin https://github.com/Daddydou/ttfl-app.git
git branch -M main
git push -u origin main
```

`.env.local` n'est pas commité (`.gitignore`) : tu renseigneras les variables
directement dans Vercel.

---

## Sécurité — ce qui protège quoi

- **RLS activé** sur toutes les tables `ttfl_*` : seul un utilisateur authentifié
  lit/écrit. La clé anon seule (sans session) ne voit rien.
- **Aucune clé service côté client** : le bundle ne contient que la clé anon.
- **Auth gate** dans le middleware : toute route hors `/login` exige une session.
- Next.js épinglé en **14.2.35** (corrige la faille de contournement
  d'auth middleware CVE-2025-29927).

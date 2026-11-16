---
name: TTFL — Le pick du soir
description: App mobile d'un joueur TTFL ; thème « Dark » repris de l'app Tennis (guide de la série Dark) : fond presque noir granuleux, titres en capitales fines très espacées, filets d'un pixel, animations lentes et douces, accent jaune balle.
colors:
  canvas: "rgb(7 8 10)"
  surface: "rgb(15 18 22)"
  surface-2: "rgb(23 27 33)"
  fill: "rgb(31 36 43)"
  thumb: "rgb(44 50 59)"
  line: "rgb(34 39 46)"
  line-strong: "rgb(62 69 80)"
  fg: "rgb(230 233 238)"
  fg-muted: "rgb(141 151 165)"
  fg-faint: "rgb(93 103 115)"
  court-400: "rgb(215 242 90)"
  court-500: "rgb(215 242 90)"
  court-600: "rgb(179 205 52)"
  on-accent: "rgb(11 13 16)"
  avail: "rgb(134 239 172)"
  quest: "rgb(252 211 77)"
  doubt: "rgb(242 166 90)"
  out: "rgb(251 113 133)"
typography:
  title-large:
    fontFamily: "Jost, Inter, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 300
    letterSpacing: "0.28em"
    textTransform: "uppercase"
  title-2:
    fontFamily: "Jost, Inter, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 300
    letterSpacing: "0.2em"
    textTransform: "uppercase"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
  section-label:
    fontFamily: "Jost, Inter, system-ui, sans-serif"
    fontSize: "11px"
    letterSpacing: "0.3em"
    textTransform: "uppercase"
rounded:
  md: "6px"
  lg: "8px"
  full: "9999px"
---

# Design System: TTFL — Le pick du soir

Refonte du 16/11/2026 : l'app reprend le thème, les effets et la grammaire de l'app **Tennis** (refonte « esprit Dark », `tennis-app/.../app/globals.css`). Quand une règle change dans l'une, la refléter dans l'autre.

## Overview

**Creative North Star : le guide interactif de la série Dark.** Un fond presque noir qui n'est jamais plat (grain, poussières fixes, fibres qui dérivent), des titres en capitales fines très espacées, des séparations par filets d'un pixel, et des mouvements lents qui sortent du flou. L'interface s'efface derrière le pick du soir.

**Key Characteristics:**
- Thème toujours sombre (plus de version claire), réglé à un seul endroit : les jetons `--c-*` de `app/globals.css`.
- Jost 300 en capitales espacées pour les titres et les libellés (`.title-large`, `.title-2`, `.section-label`, `.titre-espace`) ; Inter pour le texte courant.
- Un seul accent, le jaune balle `#d7f25a`, réservé à l'action et à la sélection. Variantes dans ☰ > Apparence (« or », « ballon »), retenues sur l'appareil (`localStorage.ttfl-accent` → `html[data-accent]`, lu avant l'affichage dans `app/layout.tsx`).
- Cartes translucides cerclées d'un filet d'un pixel ; aucune ombre visible sur le noir.
- Couleurs d'état sémantiques pour la disponibilité des joueurs, jamais pour décorer.

## Colors

Toutes les couleurs sont des triplets RGB (`--c-*`) exposés à Tailwind par `tailwind.config.ts` (opacité possible : `bg-out/10`). Contrastes mesurés sur `canvas` et `surface` : texte ≥ 4,5:1.

- **Accent** (`court-400` texte, `court-500` fond, `court-600` pressé) : jaune balle. Texte posé dessus : `on-accent` (presque noir), jamais du blanc.
- **Neutres** : `canvas` (fond, avec grain), `surface` (cartes, à 85 % + flou léger), `surface-2` (tuile en creux), `fill` (pastilles), `thumb` (curseur segmenté), `line` (filets).
- **Texte** : `fg` (#e6e9ee), `fg-muted` (#8d97a5, 6,9:1), `fg-faint` (placeholders et désactivé seulement).
- **États** : `avail` vert, `quest` ambre, `doubt` orange, `out` framboise. Fond teinté 10–15 % + texte de la même couleur.

**La Règle de l'accent unique.** L'accent ne sert qu'à l'action et à la sélection (et au point actif qui respire). Jamais pour un chiffre, un graphique ou un statut.

**La Règle zéro couleur en dur.** Aucune couleur en dur dans un composant, sauf les dessins décoratifs de `components/dark/` (terrain, parquet) et le `themeColor` du viewport.

## Typography

- **Title Large** (Jost 300, 26px, MAJUSCULES, +0.28em) : titre de page via `PageHeader`, entre en se resserrant depuis le flou (`animate-titre`).
- **Title 2** (Jost 300, 19px, MAJUSCULES, +0.2em) : titre de section ou de feuille.
- **Section label** (Jost 400, 11px, MAJUSCULES, +0.3em, `fg-muted`).
- **`.titre-espace`** : libellé Dark (navigation, étiquettes, bouton « Continuer »).
- **Headline** (Inter 600, 17px), **Subhead** (15px), **Footnote** (13px).
- **Display** (Jost 300) : noms de joueurs et gros chiffres.

**La Règle des chiffres alignés.** Tout chiffre porte `.num`. **La Règle du 16 px.** Champs et boutons à 16 px minimum (pas de zoom iOS).

## Layout

Une colonne `max-w-md` centrée, gouttière 16 px. En-tête transparent (non collant) : menu ☰ à gauche, « TTFL » espacé au centre, ballon (accueil) à droite. Barre d'onglets en bas (5 onglets). Un bandeau peut sortir du conteneur avec `.pleine-largeur` (scène de l'accueil).

## Elevation & Depth

Pas d'ombre portée (invisible sur le noir) : la profondeur vient d'un filet d'un pixel blanc à 8 % et d'une ombre noire très diffuse (`--shadow-card`). Les éléments flottants (barre d'onglets, tiroir, feuilles) sont noirs translucides avec flou.

## Shapes

Coins sobres : 6 px (boutons, champs), 8 px (cartes), pilule pour `btn-sm`, chips et puces. Les vignettes du menu sont presque carrées (2 px).

## Components

- **Boutons** : `btn-primary` = CADRE fin couleur accent, libellé Jost en capitales espacées ; aplat accent seulement à la pression/survol. `btn-secondary` / `btn-plain` = cadre blanc à 15 %. `btn-danger` = cadre et fond framboise légers. Tous `scale(0.97)` à la pression, 48 px de haut (36 px pour `btn-sm`).
- **Chips** : piste sombre, sélection pleine accent. **Segmenté** : piste sombre, sélection en cadre clair.
- **Champs** : fond `surface-2`, filet clair, anneau accent au focus.
- **Feuille modale** : panneau noir, filet en haut, monte en sortant du flou.
- **Menu tiroir** (`components/dark/MenuTiroir.tsx`) : vrai `<dialog>`, glisse depuis la gauche ; sections accordéon « Ce soir » (vignettes du terrain dessiné), « Analyse », « Système », « Apparence » ; pied : Aide, notifications, Déconnexion. Toute nouvelle page s'y ajoute (et dans « Plus »).
- **Barre d'onglets** (`components/BottomNav.tsx`) : bande noire, filet en haut, libellés Jost 9px ; l'onglet actif porte un trait lumineux.
- **Scène d'accueil** (`components/dark/SceneAccueil.tsx`) : terrain en perspective qui se trace, pick du soir du compte 01 (jamais le compte secret), équipe, « Continuer », ligne des 10 prochaines soirées.
- **Terrain dessiné** (`components/dark/TerrainDessine.tsx`) : l'équivalent basket du court de Tennis (cotes FIBA projetées), variantes `perspective` et `plan`.

## Motion

Tout en CSS (`app/globals.css`, section MOUVEMENT), opacité / flou / transformations seulement : `animate-apparition`, `animate-titre`, `animate-fondu`, `animate-pousse`, `animate-eclore`, `animate-halo`, `trait-dessine`, `cascade` (enfants l'un après l'autre). Écran d'ouverture une fois par session (`IntroOuverture`), fibres qui dérivent (`FondVivant`), transition « entonnoir » : la page sort du point touché (vignette du menu ou onglet, `components/dark/Entonnoir.tsx` + `lib/origine-entonnoir.ts`, branché dans `app/(app)/template.tsx` ; le squelette de chargement porte `aria-busy`). « Réduire les animations » : fondus courts seulement.

## Do's and Don'ts

### Do:
- **Do** passer par les jetons et les classes de `app/globals.css` (`.card`, `.btn-*`, `.field`, `.seg`, `.chip`, `.list-row`, `.titre-espace`, `.cascade`).
- **Do** mettre `.num` sur tout chiffre et garder 48 px de cible tactile.
- **Do** vérifier chaque écran à 375 px de large.
- **Do** ajouter le badge ×2 partout où un pick est affiché (voir CLAUDE.md).

### Don't:
- **Don't** réintroduire de version claire ni de couleur en dur.
- **Don't** utiliser l'accent pour décorer ; **don't** mettre du blanc sur l'accent.
- **Don't** ajouter d'animation rapide, clignotante ou gratuite : lent, doux, depuis le flou.
- **Don't** utiliser d'emoji comme icône : `components/ui/Icon.tsx`.
- **Don't** laisser une barre de défilement sur un rail de pastilles : classe `.rail`.

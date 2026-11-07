---
name: TTFL — Le pick du soir
description: App mobile d'un seul joueur TTFL ; thème « Nuit & or » : noir chaud et ivoire, accent or champagne, grand serif pour les noms et les chiffres clés, clair/sombre automatique.
colors:
  canvas: "rgb(245 242 235)"
  surface: "rgb(255 253 249)"
  surface-2: "rgb(240 236 227)"
  fill: "rgb(232 227 216)"
  thumb: "rgb(255 255 255)"
  line: "rgb(224 218 206)"
  line-strong: "rgb(199 192 178)"
  fg: "rgb(20 19 17)"
  fg-muted: "rgb(98 94 86)"
  fg-faint: "rgb(140 135 126)"
  court-400: "rgb(134 94 20)"
  court-500: "rgb(184 140 56)"
  court-600: "rgb(160 118 38)"
  on-accent: "rgb(23 19 10)"
  avail: "rgb(31 122 69)"
  quest: "rgb(138 90 0)"
  doubt: "rgb(176 74 0)"
  out: "rgb(200 0 21)"
typography:
  title-large:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "38px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title-2:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.014em"
  headline:
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.01em"
  subhead:
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.375
  footnote:
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.375
  section-label:
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.04em"
  tab-label:
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "-0.025em"
rounded:
  field: "12px"
  button: "14px"
  card: "22px"
  tab: "18px"
  sheet: "28px"
  pill: "9999px"
spacing:
  gutter: "16px"
  row-y: "12px"
  touch-min: "48px"
components:
  button-primary:
    backgroundColor: "{colors.court-500}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "48px"
  button-primary-active:
    backgroundColor: "{colors.court-600}"
  button-secondary:
    textColor: "{colors.court-400}"
    rounded: "{rounded.button}"
    height: "48px"
  button-plain:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.fg}"
    rounded: "{rounded.button}"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.out}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.button}"
    height: "48px"
  button-sm:
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  field:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
  chip:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.fg}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  chip-on:
    backgroundColor: "{colors.court-500}"
    textColor: "{colors.on-accent}"
  segmented-thumb:
    backgroundColor: "{colors.thumb}"
    textColor: "{colors.fg}"
    rounded: "9px"
---

# Design System: TTFL — Le pick du soir

## Overview

**Creative North Star: "Nuit & or"**

Un salon privé plutôt qu'un tableau de bord : noir chaud, ivoire, un seul or champagne. On l'ouvre à une main, juste avant le lock ; l'interface s'efface derrière le pick, la fraîcheur des données et le compte sur lequel on agit. Le nom du joueur et les chiffres clés sont en grand serif (Fraunces), tout le reste en Inter.

Le seul accent est l'or champagne, réservé à l'action et à la sélection. Tout le reste est neutre ; les couleurs d'état (vert / jaune / orange / rouge) ne parlent que de disponibilité. Le mode sombre (noir chaud) est le mode de référence ; le mode clair est sa déclinaison ivoire, automatique avec le réglage du téléphone.

Densité moyenne : des cartes bien rembourrées cerclées d'un filet fin, des lignes de liste compactes pour le détail. Les chiffres (scores, projections) sont toujours en chiffres tabulaires.

**Key Characteristics:**
- Grand serif (Fraunces) pour les titres de page, les titres de section et le nom du pick ; Inter pour le reste.
- Un seul accent, or champagne, pour l'action et la sélection.
- Cartes cerclées d'un filet de 1 px ; ombre diffuse seulement en clair.
- Clair / sombre automatique, réglé à un seul endroit (`app/globals.css`).
- Couleurs d'état sémantiques pour la disponibilité des joueurs.
- Cibles tactiles de 48 px minimum, champs en 16 px (pas de zoom iOS).

## Colors

Noir chaud et ivoire plus un or champagne ; les couleurs d'état parlent de disponibilité des joueurs, jamais de décoration.

Toutes les couleurs sont des variables CSS en triplets RGB (`--c-*` dans `app/globals.css`), exposées à Tailwind par `tailwind.config.ts` avec support de l'opacité (`bg-out/10`). Les valeurs du frontmatter sont celles du mode clair ; le mode sombre redéfinit chaque variable.

### Primary
- **Or champagne** (`court-500`) : fond des boutons pleins, pastille sélectionnée. Texte posé dessus : brun très foncé (`on-accent`) dans les deux modes. En sombre : rgb 201 164 92.
- **Or texte** (`court-400`) : texte, liens et onglet actif ; plus sombre en clair (rgb 134 94 20) pour rester lisible sur ivoire.
- **Or pressé** (`court-600`) : état pressé du bouton plein.

### Neutral
- **Fond de page** (`canvas`) : ivoire en clair, noir chaud en sombre (rgb 11 11 13).
- **Carte** (`surface`) et **tuile en creux** (`surface-2`) : deux niveaux de surface, rien de plus.
- **Remplissage** (`fill`) : pastilles, boutons neutres, états pressés.
- **Filets** (`line`, `line-strong`) : séparateurs de liste et poignée de feuille.
- **Texte** (`fg`), **texte secondaire** (`fg-muted`, 5:1 sur blanc), **texte effacé** (`fg-faint`, placeholders et désactivé seulement).

### Couleurs d'état
- **Disponible** (`avail`, vert), **Questionable** (`quest`, jaune ambré), **Doubtful** (`doubt`, orange), **Out** (`out`, rouge ; aussi bouton de suppression, texte `on-out`). Toujours en fond teinté à 10–15 % avec le texte de la même couleur.

### Named Rules
**La Règle de l'accent unique.** L'or ne sert qu'à l'action et à la sélection. Jamais pour décorer un titre, un fond de carte ou une donnée neutre.

**La Règle zéro couleur en dur.** Aucune couleur écrite en dur dans un composant : tout passe par les jetons `--c-*`. Seule exception : le `themeColor` du viewport dans `app/layout.tsx`.

## Typography

**Polices :** Inter (next/font) pour le texte, puis la police système (SF), Segoe UI, Roboto en repli. Fraunces (next/font, serif, classe `.display` / `font-display`) pour les titres de page, les titres de section et le nom du pick.

**Character :** l'échelle typographique d'iOS pour les tailles, avec un serif léger (graisse 400) sur les titres : on n'invente pas de nouveau style de titre, on réutilise `.title-large`, `.title-2` et `.display`.

### Hierarchy
- **Title Large** (Fraunces 400, 38px, 1.05) : titre de page via `PageHeader`, un seul par écran.
- **Title 2** (Fraunces 400, 24px) : titre de section ou de feuille modale.
- **Headline** (600, 17px) : titre de carte, nom du joueur dans une liste.
- **Display** (Fraunces 400, 28 px et plus) : nom du pick du soir, gros chiffres.
- **Subhead** (400, 15px, `fg-muted`) : sous-titres, explications.
- **Footnote** (400, 13px, `fg-muted`) : détails, dates, sources.
- **Section label** (600, 11px, MAJUSCULES, +0.14em) : en-têtes de groupes de liste.
- **Tab label** (600, 11px) : libellés de la barre d'onglets, sur une seule ligne.

### Named Rules
**La Règle des chiffres alignés.** Tout score, projection ou pourcentage porte `.num` (chiffres tabulaires).

**La Règle du 16 px.** Champs, sélecteurs et boutons à 16 px minimum : iOS ne zoome pas au focus, et le zoom manuel reste permis.

## Layout

Une colonne mobile, portrait, largeur max `max-w-md` (448 px) centrée. Gouttière de 16 px. Les cartes s'empilent ; le détail se présente en liste groupée inset (lignes de 12 px de padding vertical, filet inséré à 16 px à gauche).

Zones de sécurité iOS respectées (`.pt-safe`, `.pb-safe`, `env(safe-area-inset-*)`), y compris sous la barre d'onglets flottante et dans les feuilles modales. Au-delà de 640 px, les feuilles modales deviennent des boîtes centrées.

La barre d'onglets compte 7 onglets à largeur égale ; un libellé n'est jamais coupé ni replié, l'onglet au mot long s'élargit. Sous 360 px seulement, les libellés passent en « … ».

## Elevation & Depth

Surfaces plates cerclées d'un filet de 1 px (couleur `line` en sombre, ivoire foncé en clair) ; ombre très diffuse seulement en clair. La vraie profondeur est réservée aux éléments flottants (barre d'onglets, feuilles), en verre dépoli.

### Shadow Vocabulary
- **Carte** (`--shadow-card` : filet de 1 px, plus `0 8px 24px` très léger en clair) : toutes les cartes.
- **Flottant** (`--shadow-float` : `0 14px 36px rgb(0 0 0 / 0.65)` en sombre + filet) : barre d'onglets, feuilles modales.
- **Verre** (`.glass` : fond translucide 90-94 %, `saturate(180%) blur(28px)`, bordure fine) : barre d'onglets.

### Named Rules
**La Règle du flottant seul.** Seuls les éléments posés au-dessus du contenu (barre d'onglets, feuilles) ont une ombre marquée et du verre. Une carte ne flotte jamais.

## Shapes

Coins arrondis généreux et concentriques, à la manière d'iOS : champ 12 px, bouton 14 px, carte 22 px, onglet 18 px dans une barre de 24 px, feuille 28 px en haut. Petits boutons, pastilles et chips en pilule. Les cartes portent un filet de 1 px ; dans une liste, la séparation se fait par des filets de 0.5 px.

## Components

### Buttons
- **Forme :** 48 px de haut, coins de 14 px, texte 17 px semi-gras.
- **Plein (`btn-primary`) :** or champagne, texte brun très foncé ; pressé : or foncé et léger rétrécissement (`scale(0.97)`).
- **Secondaire (`btn-secondary`) :** fond or à 10 %, texte or.
- **Neutre (`btn-plain`) :** fond `fill`, texte normal.
- **Danger (`btn-danger`) :** rouge `out`, texte `on-out` (blanc en clair, brun foncé en sombre).
- **Petit (`btn-sm`) :** pilule de 36 px, texte 14 px.
- **Désactivé :** 40 % d'opacité. **Focus clavier :** anneau or de 2 px (`:focus-visible`), aucun anneau au toucher.

### Chips
- **Style :** pilule, fond `fill` à 80 %, 13 px semi-gras (jours, mois).
- **Sélectionnée (`chip-on`) :** or plein, texte brun très foncé.

### Cards / Containers
- **Coins :** 22 px. **Fond :** `surface`. **Bordure :** filet de 1 px (inclus dans `--shadow-card`).
- **Tuile en creux :** `surface-2` à l'intérieur d'une carte, pour un chiffre clé.

### Inputs / Fields
- **Style :** fond `surface-2`, coins de 12 px, 17 px, bordure transparente de 1.5 px.
- **Focus :** bordure or, fond qui passe à `surface`.

### Navigation
- **Barre d'onglets flottante** (`components/BottomNav.tsx`) : verre dépoli, coins de 24 px, 5 onglets icône 24 px + libellé 11 px. Actif : texte et icône or, trait plus épais, pas de fond. Pressé : fond `fill`.
- **Grand titre** (`components/ui/PageHeader.tsx`) : Title Large, sous-titre Subhead, action à droite.

### Contrôle segmenté
Rail `fill` à 70 %, curseur `thumb` avec ombre fine, coins de 11 / 9 px, 14 px semi-gras. Sert aux bascules de compte, de mode ou de période.

### Feuille modale
Monte du bas (280 ms, courbe `cubic-bezier(0.22, 1, 0.36, 1)`), poignée de 36 × 5 px, fond assombri et légèrement flouté. Centrée au-delà de 640 px.

## Do's and Don'ts

### Do:
- **Do** passer par les jetons `--c-*` et les classes de `app/globals.css` (`.card`, `.btn-*`, `.field`, `.seg`, `.chip`, `.list-row`) avant d'écrire du Tailwind sur mesure.
- **Do** mettre `.num` sur tout chiffre.
- **Do** garder 48 px de cible tactile minimum (36 px pour `btn-sm`).
- **Do** vérifier chaque écran en sombre (référence) ET en clair, et à 375 px de large.
- **Do** respecter `prefers-reduced-motion` (déjà géré globalement) : les animations restent courtes (160–280 ms).

### Don't:
- **Don't** utiliser l'or pour autre chose qu'une action ou une sélection.
- **Don't** écrire une couleur en dur (`#…`, `bg-red-500`, `text-gray-…`) dans un composant.
- **Don't** descendre sous 11 px de texte, sauf les micro-badges existants à 10 px.
- **Don't** donner une ombre marquée ou du verre à une carte.
- **Don't** bloquer le zoom (`maximumScale`) ni mettre un champ sous 16 px.
- **Don't** utiliser d'emoji ou de glyphe (🔒, ✓) comme icône : toujours `components/ui/Icon.tsx` (`cadenas`, `coche`…).
- **Don't** laisser une barre de défilement sur un rail horizontal de pastilles : classe `.rail`.

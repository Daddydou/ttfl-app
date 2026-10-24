---
name: TTFL — Le pick du soir
description: App iOS-native d'un seul joueur TTFL ; accent orange ballon sur gris système, clair/sombre automatique.
colors:
  canvas: "rgb(242 242 247)"
  surface: "rgb(255 255 255)"
  surface-2: "rgb(242 242 247)"
  fill: "rgb(229 229 234)"
  thumb: "rgb(255 255 255)"
  line: "rgb(224 224 229)"
  line-strong: "rgb(199 199 204)"
  fg: "rgb(17 17 19)"
  fg-muted: "rgb(108 108 112)"
  fg-faint: "rgb(142 142 147)"
  court-400: "rgb(194 65 12)"
  court-500: "rgb(207 69 16)"
  court-600: "rgb(178 56 10)"
  on-accent: "rgb(255 255 255)"
  avail: "rgb(36 138 61)"
  quest: "rgb(156 90 0)"
  doubt: "rgb(190 80 0)"
  out: "rgb(215 0 21)"
typography:
  title-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, Inter, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.022em"
  title-2:
    fontSize: "22px"
    fontWeight: 700
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
  card: "20px"
  tab: "22px"
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

**Creative North Star: "Le vestiaire de poche"**

Une app qui se comporte comme une app Apple native, pas comme un site : gris système, grands titres, listes groupées en encart, feuilles modales qui montent du bas, barre d'onglets flottante en verre dépoli. On l'ouvre à une main, juste avant le lock ; l'interface doit disparaître derrière le pick, la fraîcheur des données et le compte sur lequel on agit.

La seule touche d'identité est l'orange ballon de basket, réservé à l'action et à la sélection. Tout le reste est neutre et suit les conventions iOS (échelle typographique, systemGroupedBackground, couleurs d'état vert / jaune / orange / rouge). Le mode sombre est un vrai noir OLED, automatique avec le réglage du téléphone.

Densité moyenne : des cartes bien rembourrées pour l'essentiel, des lignes de liste compactes pour le détail. Les chiffres (scores, projections) sont toujours en chiffres tabulaires.

**Key Characteristics:**
- Conventions iOS natives (grand titre, liste inset, segmented control, bottom sheet, tab bar flottante).
- Un seul accent, orange ballon, pour l'action et la sélection.
- Clair / sombre automatique, réglé à un seul endroit (`app/globals.css`).
- Couleurs d'état sémantiques pour la disponibilité des joueurs.
- Cibles tactiles de 48 px minimum, champs en 16 px (pas de zoom iOS).

## Colors

Gris système iOS plus un orange ballon ; les couleurs d'état parlent de disponibilité des joueurs, jamais de décoration.

Toutes les couleurs sont des variables CSS en triplets RGB (`--c-*` dans `app/globals.css`), exposées à Tailwind par `tailwind.config.ts` avec support de l'opacité (`bg-out/10`). Les valeurs du frontmatter sont celles du mode clair ; le mode sombre redéfinit chaque variable.

### Primary
- **Orange ballon** (`court-500`) : fond des boutons pleins, pastille sélectionnée, onglet actif (à 15 %). En sombre il s'éclaircit (rgb 255 140 26) et le texte posé dessus devient brun très foncé.
- **Orange ballon foncé** (`court-400`) : texte et liens d'accent ; plus sombre en clair pour rester lisible sur blanc.
- **Orange pressé** (`court-600`) : état pressé du bouton plein.

### Neutral
- **Fond de page** (`canvas`) : gris système en clair, noir pur en sombre.
- **Carte** (`surface`) et **tuile en creux** (`surface-2`) : deux niveaux de surface, rien de plus.
- **Remplissage** (`fill`) : pastilles, boutons neutres, états pressés.
- **Filets** (`line`, `line-strong`) : séparateurs de liste et poignée de feuille.
- **Texte** (`fg`), **texte secondaire** (`fg-muted`, 5:1 sur blanc), **texte effacé** (`fg-faint`, placeholders et désactivé seulement).

### Couleurs d'état
- **Disponible** (`avail`, vert), **Questionable** (`quest`, jaune ambré), **Doubtful** (`doubt`, orange), **Out** (`out`, rouge ; aussi bouton de suppression). Toujours en fond teinté à 10–15 % avec le texte de la même couleur.

### Named Rules
**La Règle de l'accent unique.** L'orange ne sert qu'à l'action et à la sélection. Jamais pour décorer un titre, un fond de carte ou une donnée neutre.

**La Règle zéro couleur en dur.** Aucune couleur écrite en dur dans un composant : tout passe par les jetons `--c-*`. Seule exception : le `themeColor` du viewport dans `app/layout.tsx`.

## Typography

**Police :** police système Apple (SF) en priorité, Inter (next/font) en repli hors Apple, puis Segoe UI / Roboto.

**Character :** l'échelle typographique d'iOS, à l'identique : on n'invente pas de style de titre.

### Hierarchy
- **Title Large** (700, 34px, 1.08) : titre de page via `PageHeader`, un seul par écran.
- **Title 2** (700, 22px) : titre de section ou de feuille modale.
- **Headline** (600, 17px) : nom du joueur, titre de carte.
- **Subhead** (400, 15px, `fg-muted`) : sous-titres, explications.
- **Footnote** (400, 13px, `fg-muted`) : détails, dates, sources.
- **Section label** (500, 13px, MAJUSCULES, +0.04em) : en-têtes de groupes de liste.
- **Tab label** (600, 11px) : libellés de la barre d'onglets, sur une seule ligne.

### Named Rules
**La Règle des chiffres alignés.** Tout score, projection ou pourcentage porte `.num` (chiffres tabulaires).

**La Règle du 16 px.** Champs, sélecteurs et boutons à 16 px minimum : iOS ne zoome pas au focus, et le zoom manuel reste permis.

## Layout

Une colonne mobile, portrait, largeur max `max-w-md` (448 px) centrée. Gouttière de 16 px. Les cartes s'empilent ; le détail se présente en liste groupée inset (lignes de 12 px de padding vertical, filet inséré à 16 px à gauche).

Zones de sécurité iOS respectées (`.pt-safe`, `.pb-safe`, `env(safe-area-inset-*)`), y compris sous la barre d'onglets flottante et dans les feuilles modales. Au-delà de 640 px, les feuilles modales deviennent des boîtes centrées.

La barre d'onglets compte 7 onglets à largeur égale ; un libellé n'est jamais coupé ni replié, l'onglet au mot long s'élargit. Sous 360 px seulement, les libellés passent en « … ».

## Elevation & Depth

Hybride iOS : surfaces presque plates en clair (ombre très diffuse), aucune ombre en sombre (un filet blanc à 4 % les détache du noir). La vraie profondeur est réservée aux éléments flottants (barre d'onglets, feuilles), en verre dépoli.

### Shadow Vocabulary
- **Carte** (`--shadow-card` : `0 1px 2px rgb(0 0 0 / 0.04), 0 6px 20px rgb(0 0 0 / 0.05)`) : toutes les cartes.
- **Flottant** (`--shadow-float` : `0 8px 32px rgb(0 0 0 / 0.16)` + reflet intérieur) : barre d'onglets, feuilles modales.
- **Verre** (`.glass` : fond translucide 82 %, `saturate(180%) blur(28px)`, bordure 0.5 px) : barre d'onglets.

### Named Rules
**La Règle du flottant seul.** Seuls les éléments posés au-dessus du contenu (barre d'onglets, feuilles) ont une ombre marquée et du verre. Une carte ne flotte jamais.

## Shapes

Coins arrondis généreux et concentriques, à la manière d'iOS : champ 12 px, bouton 14 px, carte 20 px, onglet 22 px dans une barre de 28 px, feuille 28 px en haut. Petits boutons, pastilles et chips en pilule. Bordures quasi absentes : la séparation se fait par la couleur de surface et les filets de 0.5 px.

## Components

### Buttons
- **Forme :** 48 px de haut, coins de 14 px, texte 17 px semi-gras.
- **Plein (`btn-primary`) :** orange ballon, texte blanc ; pressé : orange foncé et léger rétrécissement (`scale(0.97)`).
- **Secondaire (`btn-secondary`) :** fond orange à 10 %, texte orange.
- **Neutre (`btn-plain`) :** fond `fill`, texte normal.
- **Danger (`btn-danger`) :** rouge `out`, texte blanc.
- **Petit (`btn-sm`) :** pilule de 36 px, texte 14 px.
- **Désactivé :** 40 % d'opacité. **Focus clavier :** anneau orange de 2 px (`:focus-visible`), aucun anneau au toucher.

### Chips
- **Style :** pilule, fond `fill` à 80 %, 13 px semi-gras (jours, mois).
- **Sélectionnée (`chip-on`) :** orange plein, texte blanc.

### Cards / Containers
- **Coins :** 20 px. **Fond :** `surface`. **Ombre :** Carte (voir Elevation). **Bordure :** aucune.
- **Tuile en creux :** `surface-2` à l'intérieur d'une carte, pour un chiffre clé.

### Inputs / Fields
- **Style :** fond `surface-2`, coins de 12 px, 17 px, bordure transparente de 1.5 px.
- **Focus :** bordure orange, fond qui passe à `surface`.

### Navigation
- **Barre d'onglets flottante** (`components/BottomNav.tsx`) : verre dépoli, coins de 28 px, 7 onglets icône 24 px + libellé 11 px. Actif : fond orange à 15 %, texte orange, trait d'icône plus épais. Pressé : fond `fill`.
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
- **Do** vérifier chaque écran en clair ET en sombre, et à 375 px de large.
- **Do** respecter `prefers-reduced-motion` (déjà géré globalement) : les animations restent courtes (160–280 ms).

### Don't:
- **Don't** utiliser l'orange pour autre chose qu'une action ou une sélection.
- **Don't** écrire une couleur en dur (`#…`, `bg-red-500`, `text-gray-…`) dans un composant.
- **Don't** descendre sous 11 px de texte, sauf les micro-badges existants à 10 px.
- **Don't** donner une ombre marquée ou du verre à une carte.
- **Don't** bloquer le zoom (`maximumScale`) ni mettre un champ sous 16 px.
- **Don't** utiliser d'emoji ou de glyphe (🔒, ✓) comme icône : toujours `components/ui/Icon.tsx` (`cadenas`, `coche`…).
- **Don't** laisser une barre de défilement sur un rail horizontal de pastilles : classe `.rail`.

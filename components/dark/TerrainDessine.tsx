/**
 * TERRAIN DESSINÉ — l'équivalent basket du « court dessiné » de l'app Tennis.
 *
 * Un terrain FIBA tracé en traits fins sur un parquet très sombre, dans
 * l'esprit du guide de la série Dark : un halo de projecteur, des lignes
 * blanches à peine appuyées. Aucun droit d'image, net à toutes les tailles.
 *
 * Deux variantes :
 *  - `perspective` : le terrain vu depuis la ligne de fond, en vraie
 *    perspective (les cotes réelles sont projetées, cf. `projeter`). Pour la
 *    scène de l'accueil. Avec `delai`, chaque ligne se dessine.
 *  - `plan` : vu de dessus, cadré par `vue` (un morceau du terrain). Pour les
 *    vignettes du menu.
 *
 * Purement décoratif (`aria-hidden`). Sans état ni hook : utilisable côté
 * serveur comme côté client.
 */

const PARQUET = {
  ciel: "#080605",
  abords: "#140e09",
  solHaut: "#2a1b0f",
  solBas: "#4a301a",
  raquette: "#1c120a",
  lumiere: "#e9bf8f",
};

/* Cotes FIBA en mètres. */
const L = 28.65; // longueur
const DEMI = 7.62; // demi-largeur
const RAQ_PROF = 5.8; // profondeur de la raquette
const RAQ_DEMI = 2.45; // demi-largeur de la raquette
const LF_R = 1.8; // cercle des lancers francs / rond central
const PANIER = 1.575; // centre du panier depuis la ligne de fond
const R3 = 6.75; // rayon à 3 points
const COIN3 = 6.6; // écart des lignes de corner
const ZONE_R = 1.25; // zone restrictive

type Pt = [number, number]; // [s = profondeur depuis la ligne de fond proche, x = écart latéral]

/** Points d'un arc (centre s0,x0 ; rayon r ; angles mesurés depuis l'axe du terrain). */
function arc(s0: number, x0: number, r: number, a1: number, a2: number, sens: 1 | -1, n = 36): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a1 + ((a2 - a1) * i) / n;
    return [s0 + sens * r * Math.cos(a), x0 + r * Math.sin(a)] as Pt;
  });
}

/** Toutes les lignes du terrain, en polylignes (mètres). */
function lignes(): Pt[][] {
  const out: Pt[][] = [
    [
      [0, -DEMI],
      [L, -DEMI],
      [L, DEMI],
      [0, DEMI],
      [0, -DEMI],
    ],
    [
      [L / 2, -DEMI],
      [L / 2, DEMI],
    ],
    arc(L / 2, 0, LF_R, 0, Math.PI * 2, 1, 48),
  ];
  const t0 = Math.asin(COIN3 / R3);
  const sCoin = PANIER + Math.sqrt(R3 * R3 - COIN3 * COIN3);
  for (const [base, sens] of [
    [0, 1],
    [L, -1],
  ] as const) {
    const s = (d: number) => base + sens * d;
    out.push([
      [s(0), -RAQ_DEMI],
      [s(RAQ_PROF), -RAQ_DEMI],
      [s(RAQ_PROF), RAQ_DEMI],
      [s(0), RAQ_DEMI],
    ]);
    out.push(arc(s(RAQ_PROF), 0, LF_R, 0, Math.PI * 2, sens, 48));
    out.push([
      [s(0), -COIN3],
      [s(sCoin), -COIN3],
      ...arc(s(PANIER), 0, R3, -t0, t0, sens, 48),
      [s(sCoin), COIN3],
      [s(0), COIN3],
    ]);
    out.push(arc(s(PANIER), 0, ZONE_R, -Math.PI / 2, Math.PI / 2, sens, 24));
  }
  return out;
}
const LIGNES = lignes();

/* ── Perspective (même projection que le court de Tennis) ─────────────── */
const Z_LOIN = 3.5;
const HORIZON = -40;
const K = 680;
const CX = 720;
const ECHELLE = 76;

function projeter(s: number, x: number): Pt {
  const z = 1 + (s * (Z_LOIN - 1)) / L;
  return [Math.round((CX + (x * ECHELLE) / z) * 10) / 10, Math.round((HORIZON + K / z) * 10) / 10];
}
const chemin = (pts: Pt[], f: (p: Pt) => Pt) =>
  pts.map((p, i) => `${i ? "L" : "M"}${f(p).join(",")}`).join(" ");

function Perspective({ delai, cadrage }: { delai: string | null; cadrage: "centre" | "haut" }) {
  const dessin = (ms: number) =>
    delai ? { pathLength: 1, className: "trait-dessine", style: { animationDelay: `calc(${delai} + ${ms}ms)` } } : {};
  const proj = (p: Pt) => projeter(p[0], p[1]);
  const poly = (pts: Pt[]) => pts.map((p) => proj(p).join(",")).join(" ");
  const sol: Pt[] = [
    [0, -DEMI],
    [L, -DEMI],
    [L, DEMI],
    [0, DEMI],
  ];
  const abords: Pt[] = [
    [-5, -DEMI - 3],
    [L + 4, -DEMI - 3],
    [L + 4, DEMI + 3],
    [-5, DEMI + 3],
  ];
  const raqLoin: Pt[] = [
    [L, -RAQ_DEMI],
    [L - RAQ_PROF, -RAQ_DEMI],
    [L - RAQ_PROF, RAQ_DEMI],
    [L, RAQ_DEMI],
  ];
  // Panneau et cercle du panier lointain, élevés (3,05 m) : ce qui donne la profondeur.
  const zP = 1 + ((L - 1.2) * (Z_LOIN - 1)) / L;
  const [bx, by] = projeter(L - 1.2, 0);
  const h = (m: number) => (m * ECHELLE) / zP;
  const zA = 1 + ((L - PANIER) * (Z_LOIN - 1)) / L;
  const [ax, ay] = projeter(L - PANIER, 0);
  return (
    <svg
      viewBox="0 0 1440 480"
      preserveAspectRatio={cadrage === "haut" ? "xMidYMin slice" : "xMidYMid slice"}
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="terrain-p-l" cx="50%" cy="-5%" r="75%">
          <stop offset="0" stopColor={PARQUET.lumiere} stopOpacity="0.3" />
          <stop offset="0.55" stopColor={PARQUET.lumiere} stopOpacity="0.05" />
          <stop offset="1" stopColor={PARQUET.lumiere} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="terrain-p-s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PARQUET.solHaut} />
          <stop offset="1" stopColor={PARQUET.solBas} />
        </linearGradient>
      </defs>
      <rect width="1440" height="480" fill={PARQUET.ciel} />
      <polygon points={poly(abords)} fill={PARQUET.abords} />
      <polygon points={poly(sol)} fill="url(#terrain-p-s)" />
      <polygon points={poly(raqLoin)} fill={PARQUET.raquette} fillOpacity="0.55" />
      <g stroke="#fff" strokeOpacity="0.34" strokeWidth="1.3" fill="none" strokeLinejoin="round">
        {LIGNES.map((pts, i) => (
          <path key={i} d={chemin(pts, proj)} {...dessin(i * 110)} />
        ))}
      </g>
      {/* Poteau, panneau et arceau lointains. */}
      <g fill="none" strokeLinecap="round">
        <line x1={bx} y1={by} x2={bx} y2={by - h(2.9)} stroke="#fff" strokeOpacity="0.12" strokeWidth="1.2" {...dessin(1200)} />
        <rect
          x={bx - h(0.9)}
          y={by - h(3.95)}
          width={h(1.8)}
          height={h(1.05)}
          stroke="#fff"
          strokeOpacity="0.38"
          strokeWidth="1.2"
          {...dessin(1300)}
        />
        <ellipse
          cx={ax}
          cy={ay - (3.05 * ECHELLE) / zA}
          rx={(0.23 * ECHELLE) / zA}
          ry={(0.08 * ECHELLE) / zA}
          stroke="rgb(var(--c-accent))"
          strokeOpacity="0.9"
          strokeWidth="1.6"
          {...dessin(1450)}
        />
      </g>
      <rect width="1440" height="480" fill="url(#terrain-p-l)" />
    </svg>
  );
}

/* ── Plan (vu de dessus) ─────────────────────────────────────────────── */
function Plan({ vue }: { vue: string }) {
  // Repère du plan : x = s (0 → 28,65), y = x + 7,62 (0 → 15,24).
  const f = (p: Pt): Pt => [p[0], p[1] + DEMI];
  return (
    <svg viewBox={vue} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="terrain-v-l" cx="50%" cy="0%" r="90%">
          <stop offset="0" stopColor={PARQUET.lumiere} stopOpacity="0.28" />
          <stop offset="1" stopColor={PARQUET.lumiere} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="terrain-v-s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PARQUET.solHaut} />
          <stop offset="1" stopColor={PARQUET.solBas} />
        </linearGradient>
      </defs>
      <rect x="-10" y="-10" width={L + 20} height={2 * DEMI + 20} fill={PARQUET.abords} />
      <rect x="0" y="0" width={L} height={2 * DEMI} fill="url(#terrain-v-s)" />
      <rect x="0" y={DEMI - RAQ_DEMI} width={RAQ_PROF} height={2 * RAQ_DEMI} fill={PARQUET.raquette} fillOpacity="0.6" />
      <rect x={L - RAQ_PROF} y={DEMI - RAQ_DEMI} width={RAQ_PROF} height={2 * RAQ_DEMI} fill={PARQUET.raquette} fillOpacity="0.6" />
      <g stroke="#fff" strokeOpacity="0.55" strokeWidth="0.07" fill="none" strokeLinejoin="round">
        {LIGNES.map((pts, i) => (
          <path key={i} d={chemin(pts, f)} />
        ))}
      </g>
      <circle cx={PANIER} cy={DEMI} r="0.23" fill="none" stroke="rgb(var(--c-accent))" strokeWidth="0.08" />
      <circle cx={L - PANIER} cy={DEMI} r="0.23" fill="none" stroke="rgb(var(--c-accent))" strokeWidth="0.08" />
      <rect x="-10" y="-10" width={L + 20} height={2 * DEMI + 20} fill="url(#terrain-v-l)" />
    </svg>
  );
}

/** Cadrages prêts à l'emploi pour les vignettes (morceaux carrés du terrain, en mètres). */
export const VUES = {
  raquette: "0 1.5 12.2 12.2",
  centre: "8.2 1.5 12.2 12.2",
  corner: "-0.6 -0.6 8 8",
  troisPoints: "1.5 0.5 9 9",
  lancer: "16.5 2.5 10 10",
  entier: "-0.8 -0.8 30.25 16.84",
} as const;

export default function TerrainDessine({
  variante = "perspective",
  cadrage = "centre",
  vue = VUES.raquette,
  delai = null,
}: {
  variante?: "perspective" | "plan";
  /** Perspective : `haut` garde le fond du terrain et le panneau, coupe le premier plan. */
  cadrage?: "centre" | "haut";
  /** Plan : morceau du terrain à montrer (viewBox, en mètres). */
  vue?: string;
  /** Perspective : les lignes se dessinent, à partir de ce délai CSS (ex. `calc(var(--intro, 0s) + 0ms)`). */
  delai?: string | null;
}) {
  return variante === "plan" ? <Plan vue={vue} /> : <Perspective delai={delai} cadrage={cadrage} />;
}

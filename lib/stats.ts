import type { TtflPick } from "./types";

export interface Bucket {
  label: string;
  min: number;
  max: number; // exclusif, sauf le dernier
  count: number;
  color: string;
}

// Tranches demandées : zéros, <20, 20-30, 30-40, 40-50, >50.
export function distribution(scores: number[]): Bucket[] {
  const defs: Omit<Bucket, "count">[] = [
    { label: "> 50", min: 50, max: Infinity, color: "#22c55e" },
    { label: "40–50", min: 40, max: 50, color: "#84cc16" },
    { label: "30–40", min: 30, max: 40, color: "#f59e0b" },
    { label: "20–30", min: 20, max: 30, color: "#fb923c" },
    { label: "< 20", min: 1, max: 20, color: "#f97316" },
    { label: "Zéros", min: 0, max: 1, color: "#ef4444" },
  ];
  return defs.map((d) => ({
    ...d,
    count: scores.filter((s) => s >= d.min && s < d.max).length,
  }));
}

export interface CumPoint {
  index: number; // 1-based ordre chronologique
  date: string;
  player: string;
  score: number;
  cumAvg: number;
}

// Points de la courbe : score de chaque pick (chronologique) + moyenne cumulée.
export function cumulative(picksAsc: TtflPick[]): CumPoint[] {
  let sum = 0;
  const out: CumPoint[] = [];
  picksAsc.forEach((p, i) => {
    const score = p.score ?? 0;
    sum += score;
    out.push({
      index: i + 1,
      date: p.pick_date,
      player: p.player,
      score,
      cumAvg: sum / (i + 1),
    });
  });
  return out;
}

export interface RoundCluster {
  label: string;
  n: number;
  total: number;
  avg: number;
}

const ROUND_LABELS = ["1er tour", "2e tour", "Conf. finale", "Finales"];

// Regroupe les picks de playoffs en "tours" à partir des trous du calendrier :
// un écart de plus de `gapDays` jours entre deux picks marque un nouveau tour.
// C'est une ESTIMATION (le tour exact n'est pas stocké) mais elle donne bien la
// courbe d'épuisement, tour après tour.
export function roundClusters(
  scoredPicksAsc: TtflPick[],
  gapDays = 4,
): RoundCluster[] {
  if (scoredPicksAsc.length === 0) return [];
  const clusters: TtflPick[][] = [[scoredPicksAsc[0]]];
  for (let i = 1; i < scoredPicksAsc.length; i++) {
    const prev = new Date(scoredPicksAsc[i - 1].pick_date).getTime();
    const cur = new Date(scoredPicksAsc[i].pick_date).getTime();
    const gap = (cur - prev) / 86400000;
    if (gap > gapDays) clusters.push([scoredPicksAsc[i]]);
    else clusters[clusters.length - 1].push(scoredPicksAsc[i]);
  }
  return clusters.map((c, i) => {
    const total = c.reduce((s, p) => s + (p.score ?? 0), 0);
    return {
      label: ROUND_LABELS[i] ?? `Tour ${i + 1}`,
      n: c.length,
      total,
      avg: total / c.length,
    };
  });
}

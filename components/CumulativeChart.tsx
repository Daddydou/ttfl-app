import type { CumPoint } from "@/lib/stats";

// Courbe SVG rendue côté serveur (statique, aucune dépendance externe).
// Barres = score de chaque pick ; ligne = moyenne cumulée.
export function CumulativeChart({ points }: { points: CumPoint[] }) {
  if (points.length === 0) return null;

  const W = 320;
  const H = 140;
  const padL = 8;
  const padR = 8;
  const padT = 10;
  const padB = 18;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const maxScore = Math.max(60, ...points.map((p) => p.score));
  const n = points.length;
  const bandW = iw / n;
  const barW = Math.max(3, Math.min(22, bandW * 0.6));

  const x = (i: number) => padL + bandW * (i + 0.5);
  const y = (v: number) => padT + ih - (v / maxScore) * ih;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cumAvg).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Courbe du cumul et des scores par pick"
    >
      {/* repères horizontaux à 20 / 40 / 60 */}
      {[20, 40, 60].map((v) => (
        <g key={v}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(v)}
            y2={y(v)}
            stroke="#25334a"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <text x={padL} y={y(v) - 2} fill="#33445f" fontSize="8">
            {v}
          </text>
        </g>
      ))}

      {/* barres de score */}
      {points.map((p, i) => (
        <rect
          key={i}
          x={x(i) - barW / 2}
          y={y(p.score)}
          width={barW}
          height={padT + ih - y(p.score)}
          rx={Math.min(3, barW / 2)}
          fill={p.score === 0 ? "#ef4444" : "#f9731688"}
        />
      ))}

      {/* ligne de moyenne cumulée */}
      <path d={line} fill="none" stroke="#ff9f43" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.cumAvg)} r="2" fill="#ff9f43" />
      ))}
    </svg>
  );
}

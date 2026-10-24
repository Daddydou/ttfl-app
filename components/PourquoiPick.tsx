import { comparerPicks, type ChiffresJoueur, type LigneComparaison } from "@/lib/pourquoi";
import { fmtNum } from "@/lib/format";

function Barres({ l, n1, n2 }: { l: LigneComparaison; n1: string; n2: string }) {
  const max = Math.max(l.a ?? 0, l.b ?? 0, 0.0001);
  const largeur = (v: number | null) => `${v === null ? 0 : Math.max(2, (v / max) * 100)}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium text-fg">{l.libelle}</span>
        <span className="text-fg-muted">
          {l.ecart === null ? "—" : `${l.ecart >= 0 ? "+" : "−"}${fmtNum(Math.abs(l.ecart), 1)}`}
        </span>
      </div>
      <div className="mt-1 space-y-1" role="img" aria-label={`${l.libelle} : ${n1} ${fmtNum(l.a)}, ${n2} ${fmtNum(l.b)}`}>
        <div className="flex items-center gap-2">
          <div className="h-2.5 rounded-full bg-court-500" style={{ width: largeur(l.a) }} />
          <span className="text-[12px] font-semibold num text-fg">{fmtNum(l.a)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 rounded-full bg-fill" style={{ width: largeur(l.b) }} />
          <span className="text-[12px] num text-fg-muted">{fmtNum(l.b)}</span>
        </div>
      </div>
    </div>
  );
}

// Carte « Pourquoi le n°1 ? » : le n°1 (orange) comparé au n°2 (gris) sur les chiffres du moteur.
export function PourquoiPick({ n1, n2 }: { n1: ChiffresJoueur; n2: ChiffresJoueur }) {
  const c = comparerPicks(n1, n2);
  const matchup = c.lignes.find((l) => l.id === "matchup")!;
  return (
    <section className="card p-4" aria-labelledby="titre-pourquoi">
      <h2 id="titre-pourquoi" className="headline">Pourquoi le n°1 ?</h2>
      <p className="mb-3 mt-1 text-[13px] text-fg-muted">{`${n1.player} (orange) comparé à ${n2.player} (gris), le n°2.`}</p>
      <div className="space-y-3">
        {c.lignes.filter((l) => l.id !== "matchup").map((l) => (
          <Barres key={l.id} l={l} n1={n1.player} n2={n2.player} />
        ))}
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-medium text-fg">Matchup</span>
          <span className="text-fg-muted">
            ×{fmtNum(matchup.a, 2)} <span className="text-fg-muted">contre</span> ×{fmtNum(matchup.b, 2)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-[14px] leading-snug text-fg">{c.phrase}</p>
    </section>
  );
}

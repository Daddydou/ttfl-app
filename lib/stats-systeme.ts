// Statistiques « Système » : les passages du moteur dans le cloud (table ttfl_moteur_passages). Logique PURE, testée
// dans tests/stats-systeme.test.ts. Un passage est en échec quand son code de sortie n'est ni vide ni 0.

import { grouper, moyenne } from "@/lib/stats-outils";

export interface Passage {
  tache: string;
  mode: string;
  debut_le: string;
  fin_le: string | null;
  code: number | null;
  echecs: string | null;
}

export const estEchec = (p: Pick<Passage, "code">): boolean => p.code !== null && p.code !== undefined && p.code !== 0;

const dureeS = (p: Passage): number | null => {
  if (!p.fin_le) return null;
  const d = (Date.parse(p.fin_le) - Date.parse(p.debut_le)) / 1000;
  return Number.isFinite(d) && d >= 0 ? d : null;
};

// Jour (AAAA-MM-JJ) à Paris d'un instant ISO.
export function jourParis(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export interface LigneTache {
  tache: string;
  passages: number;
  echecs: number;
  dureeMoyenne: number | null; // secondes
  dernier: string; // ISO
  dernierEnEchec: boolean;
}

export interface BilanSysteme {
  passages: number;
  echecs: number;
  tauxReussite: number | null; // %
  dureeMoyenne: number | null;
  dernier: string | null;
  parTache: LigneTache[];
  parJour: { jour: string; passages: number; echecs: number }[];
  echecsRecents: Passage[];
}

export function bilanSysteme(passages: Passage[]): BilanSysteme {
  const tries = [...passages].sort((a, b) => b.debut_le.localeCompare(a.debut_le));
  const echecs = tries.filter(estEchec);
  const parTache = [...grouper(tries, (p) => p.tache).entries()]
    .map(([tache, ps]) => ({
      tache,
      passages: ps.length,
      echecs: ps.filter(estEchec).length,
      dureeMoyenne: moyenne(ps.map(dureeS).filter((d): d is number => d !== null)),
      dernier: ps[0].debut_le,
      dernierEnEchec: estEchec(ps[0]),
    }))
    .sort((a, b) => b.passages - a.passages || a.tache.localeCompare(b.tache));
  const parJour = [...grouper(tries, (p) => jourParis(p.debut_le)).entries()]
    .map(([jour, ps]) => ({ jour, passages: ps.length, echecs: ps.filter(estEchec).length }))
    .sort((a, b) => a.jour.localeCompare(b.jour));
  return {
    passages: tries.length,
    echecs: echecs.length,
    tauxReussite: tries.length ? ((tries.length - echecs.length) / tries.length) * 100 : null,
    dureeMoyenne: moyenne(tries.map(dureeS).filter((d): d is number => d !== null)),
    dernier: tries[0]?.debut_le ?? null,
    parTache,
    parJour,
    echecsRecents: echecs.slice(0, 8),
  };
}

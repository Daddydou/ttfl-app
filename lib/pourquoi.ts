// « Pourquoi ce pick ? » : compare le n°1 conseillé au n°2 avec les chiffres DÉJÀ calculés par le moteur
// (projection, forme, plafond, matchup). Aucun calcul de score ici : seulement des écarts et des proportions.

export interface ChiffresJoueur {
  player: string;
  projection: number | null;
  forme: number | null;
  ceiling: number | null;
  matchup_factor: number | null;
}

export interface LigneComparaison {
  id: "projection" | "forme" | "plafond" | "matchup";
  libelle: string;
  a: number | null; // n°1
  b: number | null; // n°2
  ecart: number | null; // a - b
  relatif: number | null; // (a - b) / b, en proportion
}

export interface Comparaison {
  lignes: LigneComparaison[];
  atout: LigneComparaison | null; // où le n°1 prend le plus d'avance (en proportion), parmi forme / plafond / matchup
  retard: LigneComparaison | null; // où le n°1 est moins bon que le n°2, s'il y en a un (le plus marqué)
  phrase: string;
}

const ligne = (id: LigneComparaison["id"], libelle: string, a: number | null, b: number | null): LigneComparaison => {
  const ok = a !== null && b !== null;
  return { id, libelle, a, b, ecart: ok ? a - b : null, relatif: ok && b !== 0 ? (a - b) / Math.abs(b) : null };
};

const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.round(Math.abs(x) * 100)} %`;
const pts = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(1).replace(".", ",")} pts`;

export function comparerPicks(n1: ChiffresJoueur, n2: ChiffresJoueur): Comparaison {
  const lignes = [
    ligne("projection", "Projection", n1.projection, n2.projection),
    ligne("forme", "Forme récente", n1.forme, n2.forme),
    ligne("plafond", "Plafond", n1.ceiling, n2.ceiling),
    ligne("matchup", "Matchup", n1.matchup_factor, n2.matchup_factor),
  ];
  const causes = lignes.filter((l) => l.id !== "projection" && l.relatif !== null);
  const atout = causes.filter((l) => (l.relatif as number) > 0.005).sort((x, y) => (y.relatif as number) - (x.relatif as number))[0] ?? null;
  const retard = causes.filter((l) => (l.relatif as number) < -0.005).sort((x, y) => (x.relatif as number) - (y.relatif as number))[0] ?? null;

  const proj = lignes[0];
  const morceaux: string[] = [];
  if (proj.ecart !== null) {
    morceaux.push(
      proj.ecart > 0.05
        ? `${n1.player} devance ${n2.player} de ${pts(proj.ecart)} en projection`
        : `${n1.player} et ${n2.player} sont au coude à coude en projection (${pts(proj.ecart)})`,
    );
  } else {
    morceaux.push(`${n1.player} passe devant ${n2.player}`);
  }
  if (atout) morceaux.push(`avantage principal : ${atout.libelle.toLowerCase()} (${pct(atout.relatif as number)})`);
  if (retard) morceaux.push(`mais ${retard.libelle.toLowerCase()} moins bon (${pct(retard.relatif as number)})`);
  return { lignes, atout, retard, phrase: morceaux.join(" ; ") + "." };
}

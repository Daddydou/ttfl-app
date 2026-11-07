// Petits outils de calcul et d'affichage partagés par les pages Stats (logique PURE : aucun accès réseau).

export const arrondi = (x: number, d = 1): number => Math.round(x * 10 ** d) / 10 ** d;

export function somme(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function moyenne(xs: number[]): number | null {
  return xs.length ? somme(xs) / xs.length : null;
}

// Écart-type (dispersion) : plus il est petit, plus les scores sont réguliers. Il faut au moins 2 valeurs.
export function ecartType(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = somme(xs) / xs.length;
  return Math.sqrt(somme(xs.map((x) => (x - m) ** 2)) / xs.length);
}

export function mediane(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const t = [...xs].sort((a, b) => a - b);
  const milieu = Math.floor(t.length / 2);
  return t.length % 2 ? t[milieu] : (t[milieu - 1] + t[milieu]) / 2;
}

// Nombre à la française : « 36,4 » ; « — » quand la valeur est inconnue.
export function fmt(x: number | null | undefined, decimales = 1): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return x.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function fmtEntier(x: number | null | undefined): string {
  return fmt(x, 0);
}

// Avec un signe : « +3,0 », « −2,4 » (vrai signe moins), « 0,0 ».
export function fmtSigne(x: number | null | undefined, decimales = 1): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  const texte = fmt(Math.abs(x), decimales);
  if (arrondi(x, decimales) === 0) return texte;
  return `${x > 0 ? "+" : "−"}${texte}`;
}

// Part en pourcentage (0 à 100), ou null s'il n'y a rien à diviser.
export function pourcent(partie: number, total: number): number | null {
  return total > 0 ? (partie / total) * 100 : null;
}

export function fmtPourcent(x: number | null | undefined): string {
  return x === null || x === undefined ? "—" : `${fmt(x, 0)} %`;
}

export const JOURS_COURTS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."] as const;

// 0 = lundi … 6 = dimanche, pour une date AAAA-MM-JJ (date de New York, lue sans fuseau).
export function jourSemaine(date: string): number {
  const jour = new Date(`${date.slice(0, 10)}T00:00:00Z`).getUTCDay();
  return (jour + 6) % 7;
}

// « 07/11 » à partir de « 2026-11-07 ».
export function jourMois(date: string): string {
  const d = date.slice(0, 10);
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

export function dateCourte(date: string): string {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Regroupe des éléments par clé (ordre d'apparition conservé).
export function grouper<T>(items: T[], cle: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = cle(item);
    const liste = out.get(k);
    if (liste) liste.push(item);
    else out.set(k, [item]);
  }
  return out;
}

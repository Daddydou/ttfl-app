// Visages des joueurs : photos LIBRES de Wikimedia Commons, sinon les initiales.
//
// Les données viennent de lib/visages-data.json, généré par `node scripts/visages-wikimedia.mjs <joueurs.csv>` (Wikidata
// P18 + licence/auteur de Commons). Aucune image n'est stockée dans le projet : on garde l'adresse de la miniature et ses
// crédits. Un joueur sans photo libre (ou dont la photo ne charge pas) montre ses initiales. LECTURE SEULE, aucun calcul.
import data from "@/lib/visages-data.json";
import { normaliserNom } from "@/lib/planning";

export interface Visage {
  nom: string;
  url: string; // miniature (≈128 px)
  auteur: string;
  licence: string;
  page: string; // page du fichier sur Commons (crédits)
}

interface Brut {
  url: string;
  auteur: string;
  licence: string;
  page: string;
}

const parCle = new Map<string, Visage>(
  Object.entries(data.visages as Record<string, Brut>).map(([nom, v]) => [normaliserNom(nom), { nom, ...v }]),
);

export function visageDe(nom: string | null | undefined): Visage | null {
  if (!nom) return null;
  return parCle.get(normaliserNom(nom)) ?? null;
}

// « Luka Dončić » → « LD » ; « Shai Gilgeous-Alexander » → « SG » ; « Bobby Portis Jr. » → « BP » (suffixes ignorés).
export function initiales(nom: string): string {
  const mots = nom
    .trim()
    .split(/\s+/)
    .filter((m) => m && !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(m));
  if (mots.length === 0) return "?";
  const premiere = mots[0][0];
  const derniere = mots.length > 1 ? mots[mots.length - 1][0] : "";
  return (premiere + derniere).toLocaleUpperCase("fr");
}

// Pour la page « Crédits photos » : tous les joueurs qui ont une photo, par ordre alphabétique.
export function creditsVisages(): Visage[] {
  return [...parCle.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

export function nbSansPhoto(): number {
  return (data.sansPhoto as string[]).length;
}

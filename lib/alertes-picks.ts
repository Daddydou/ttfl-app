// Alertes « avant les matchs » (logique PURE, aucun accès réseau) :
//  - un pick de ce soir est devenu Out / douteux / absent saisi à la main ;
//  - un compte n'a aucun pick pour ce soir.
// Pour chacune, on propose un remplaçant : le meilleur du classement conseillé qui respecte le cycle de 30 jours
// sur TOUS les comptes concernés, et qui ne dépasse pas la part maximale d'un même joueur sur l'équipe.
// C'est une PROPOSITION : rien n'est écrit sans validation manuelle.

import { construireConseilles, absentsActifs, type LigneSoiree } from "@/lib/conseilles";
import { PART_MAX } from "@/lib/repartition";
import { ZONES, normaliserNom, type PickLigne, type Zone } from "@/lib/planning";
import type { TtflManualAbsent } from "@/lib/types";

export type TypeAlerte = "out" | "absent" | "incertain" | "sans_pick";

export interface Remplacant {
  player: string;
  projection: number | null;
}

export interface AlertePick {
  id: string;
  type: TypeAlerte;
  zone: Zone["id"];
  zoneLabel: string;
  joueur: string | null; // null pour « sans pick »
  comptes: string[];
  statut: string | null;
  remplacant: Remplacant | null;
}

const INCERTAINS = new Set(["questionable", "doubtful"]);

function typeRisque(statut: string | null | undefined, absent: boolean): TypeAlerte | null {
  if (absent) return "absent";
  const s = String(statut ?? "").toLowerCase();
  if (s === "out") return "out";
  if (INCERTAINS.has(s)) return "incertain";
  return null;
}

export function alertesPicksDuSoir({
  date,
  picksDuSoir,
  voisins,
  lignes,
  absents,
  zones = ZONES,
  runDuSoirDisponible,
}: {
  date: string;
  picksDuSoir: PickLigne[]; // picks voulus pour `date`, tous comptes
  voisins: PickLigne[]; // picks à ±30 jours, tous comptes (cycle)
  lignes: LigneSoiree[]; // vivier de la soirée (fusionnerSoiree)
  absents: TtflManualAbsent[];
  zones?: Zone[];
  runDuSoirDisponible: boolean; // sans blessures fraîches, un statut manquant ne prouve rien
}): AlertePick[] {
  const statutDe = new Map(lignes.map((l) => [normaliserNom(l.player), l.status ?? null]));
  const absentsDuJour = absentsActifs(absents, date);
  const sortie: AlertePick[] = [];

  for (const zone of zones) {
    const picksZone = picksDuSoir.filter((p) => zone.comptes.includes(p.compte));
    const parJoueur = new Map<string, { player: string; comptes: string[] }>();
    for (const p of picksZone) {
      const cle = normaliserNom(p.player);
      const g = parJoueur.get(cle) ?? { player: p.player, comptes: [] };
      g.comptes.push(p.compte);
      parJoueur.set(cle, g);
    }

    const proposer = (comptes: string[], exclus: string[]): Remplacant | null => {
      const { conseilles } = construireConseilles({
        lignes,
        comptes,
        picks: voisins,
        absents,
        date,
        n: 40,
      });
      const plafond = Math.max(1, Math.ceil(PART_MAX * zone.comptes.length));
      const interdits = new Set(exclus.map(normaliserNom));
      for (const c of conseilles) {
        const cle = normaliserNom(c.player);
        if (interdits.has(cle)) continue;
        if (c.comptesBloques.length > 0) continue; // libre sur TOUS les comptes concernés
        const dejaPris = picksZone.filter(
          (p) => normaliserNom(p.player) === cle && !comptes.includes(p.compte),
        ).length;
        if (zone.comptes.length > 1 && dejaPris + comptes.length > plafond) continue;
        return { player: c.player, projection: c.projection };
      }
      return null;
    };

    for (const [cle, g] of parJoueur) {
      const statut = statutDe.get(cle) ?? null;
      // Sans run du soir, un statut absent de la liste n'est pas une bonne nouvelle : on ne signale que l'absent saisi.
      const type = typeRisque(runDuSoirDisponible ? statut : null, absentsDuJour.has(cle));
      if (!type) continue;
      sortie.push({
        id: `${zone.id}-${cle}`,
        type,
        zone: zone.id,
        zoneLabel: zone.label,
        joueur: g.player,
        comptes: [...g.comptes].sort(),
        statut,
        remplacant: proposer(g.comptes, [g.player, ...picksZone.map((p) => p.player).filter((n) => normaliserNom(n) === cle)]),
      });
    }

    const pris = new Set(picksZone.map((p) => p.compte));
    const sans = zone.comptes.filter((c) => !pris.has(c));
    if (sans.length > 0) {
      sortie.push({
        id: `${zone.id}-sans-pick`,
        type: "sans_pick",
        zone: zone.id,
        zoneLabel: zone.label,
        joueur: null,
        comptes: sans,
        statut: null,
        remplacant: proposer(sans, []),
      });
    }
  }

  // Le plus grave d'abord : Out/absent, puis incertain, puis comptes sans pick.
  const ordre: Record<TypeAlerte, number> = { out: 0, absent: 0, incertain: 1, sans_pick: 2 };
  return sortie.sort((a, b) => ordre[a.type] - ordre[b.type]);
}

export function messageAlerte(a: AlertePick): string {
  const qui = a.comptes.length === 1 ? `compte ${a.comptes[0]}` : `${a.comptes.length} comptes (${a.comptes.join(", ")})`;
  switch (a.type) {
    case "out":
      return `${a.joueur} est annoncé Out — ${qui} (${a.zoneLabel}).`;
    case "absent":
      return `${a.joueur} est marqué absent — ${qui} (${a.zoneLabel}).`;
    case "incertain":
      return `${a.joueur} est incertain (${a.statut}) — ${qui} (${a.zoneLabel}).`;
    case "sans_pick":
      return `Aucun pick ce soir pour ${qui} (${a.zoneLabel}).`;
  }
}

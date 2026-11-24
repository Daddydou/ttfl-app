import { describe, it, expect } from "vitest";
import { grouperParDate, reprisesAdversaires, topDeLaNuit, type NuitTop } from "@/lib/adversaires-reprises";
import { nomJoueurSuivi } from "@/lib/adversaires";
import type { LigneSoiree } from "@/lib/conseilles";
import type { TtflManualAbsent, TtflSuivi, TtflSuiviPick } from "@/lib/types";

// Ce que chaque adversaire peut reprendre dans les 7 jours (24/11/2026).
const AUJ = "2026-11-23";

const ligne = (player: string, projection: number | null, extra: Partial<LigneSoiree> = {}): LigneSoiree => ({
  player, team: "LAL", opponent: "BOS", position: null, projection, forme: null, ceiling: null, matchup_factor: null,
  status: null, is_urgent: false, explanation: null, historique: null, source: "avance", ...extra,
});
const suivi = (id: number, pseudo: string, rang: number | null = id): TtflSuivi => ({
  users_id: id, pseudo, equipe: null, rang, points: 1000, moyenne: null, best_picks: 0, x2: 0, suivi: true, maj_le: "2026-11-23T08:00:00Z",
});
const pick = (id: number, date: string, joueur: string): TtflSuiviPick => ({ users_id: id, pick_date: date, joueur });
const nuit = (date: string, noms: string[]): NuitTop => ({
  date,
  joueurs: noms.map((player, i) => ({ player, team: "LAL", opponent: "BOS", projection: 60 - i, rang: i + 1 })),
});

describe("nomJoueurSuivi : le site colle le score au nom", () => {
  it("retire « · 76 pts » et « · 89×2=178 pts »", () => {
    expect(nomJoueurSuivi("Nikola Jokić · 76 pts")).toBe("Nikola Jokić");
    expect(nomJoueurSuivi("Victor Wembanyama · 89×2=178 pts")).toBe("Victor Wembanyama");
    expect(nomJoueurSuivi("Luka Doncic")).toBe("Luka Doncic");
  });
});

describe("topDeLaNuit", () => {
  const lignes = [ligne("A", 50), ligne("B", 60), ligne("C", 40, { status: "Out" as LigneSoiree["status"] }), ligne("D", 45), ligne("E", null), ligne("B", 59)];

  it("classe par projection, sans doublon, sans Out ni projection inconnue", () => {
    const t = topDeLaNuit(lignes, [], AUJ);
    expect(t.joueurs.map((j) => [j.player, j.rang])).toEqual([["B", 1], ["A", 2], ["D", 3]]);
  });

  it("retire les absents saisis à la main et limite à n joueurs", () => {
    const absent = { player: "B", date_debut: AUJ, date_fin: null } as unknown as TtflManualAbsent;
    expect(topDeLaNuit(lignes, [absent], AUJ).joueurs.map((j) => j.player)).toEqual(["A", "D"]);
    expect(topDeLaNuit(lignes, [], AUJ, 2).joueurs).toHaveLength(2);
  });
});

describe("reprisesAdversaires", () => {
  const nuits = [nuit("2026-11-23", ["Jokic", "Doncic", "Embiid"]), nuit("2026-11-24", ["Jokic", "Doncic", "Edwards"])];

  it("un joueur pické à 30 jours ou moins est bloqué ; les autres sont proposés à leur première date", () => {
    const r = reprisesAdversaires([suivi(1, "Alpha")], [pick(1, "2026-11-22", "Doncic · 32 pts")], nuits, AUJ)[0];
    expect(r.reprises.map((x) => x.player)).toEqual(["Jokic", "Embiid", "Edwards"]);
    expect(r.reprises.map((x) => x.date)).toEqual(["2026-11-23", "2026-11-23", "2026-11-24"]);
  });

  it("chaque joueur n'apparaît qu'à sa première date possible, avec son rang de cette soirée", () => {
    const r = reprisesAdversaires([suivi(1, "Alpha")], [], nuits, AUJ)[0];
    expect(r.reprises.filter((x) => x.player === "Jokic")).toHaveLength(1);
    expect(r.reprises.find((x) => x.player === "Edwards")).toMatchObject({ date: "2026-11-24", rang: 3 });
  });

  it("un pick vieux de 31 jours est libéré : repris, avec la date de son dernier pick", () => {
    // pické le 23/10 : bloqué jusqu'au 22/11 inclus (30 jours), libre le 23/11
    const r = reprisesAdversaires([suivi(1, "Alpha")], [pick(1, "2026-10-23", "Jokic · 50 pts")], nuits, AUJ)[0];
    const jokic = r.reprises.find((x) => x.player === "Jokic")!;
    expect(jokic.date).toBe("2026-11-23");
    expect(jokic.dejaPicke).toBe("2026-10-23");
  });

  it("un joueur libéré en cours de fenêtre apparaît à la date de libération", () => {
    // pické le 24/10 : libre à partir du 24/11
    const r = reprisesAdversaires([suivi(1, "Alpha")], [pick(1, "2026-10-24", "Jokic")], nuits, AUJ)[0];
    expect(r.reprises.find((x) => x.player === "Jokic")).toMatchObject({ date: "2026-11-24", dejaPicke: "2026-10-24" });
  });

  it("chaque adversaire a son propre blocage ; classés par rang", () => {
    const res = reprisesAdversaires([suivi(2, "Beta", 50), suivi(1, "Alpha", 5)], [pick(1, "2026-11-20", "Jokic")], nuits, AUJ);
    expect(res.map((x) => x.suivi.pseudo)).toEqual(["Alpha", "Beta"]);
    expect(res[0].reprises.map((x) => x.player)).not.toContain("Jokic");
    expect(res[1].reprises.map((x) => x.player)).toContain("Jokic");
  });

  it("sans projection : aucune reprise, sans erreur", () => {
    expect(reprisesAdversaires([suivi(1, "Alpha")], [], [], AUJ)[0].reprises).toEqual([]);
  });

  it("grouperParDate regroupe les reprises consécutives d'une même soirée", () => {
    const r = reprisesAdversaires([suivi(1, "Alpha")], [], nuits, AUJ)[0];
    expect(grouperParDate(r.reprises).map((g) => [g.date, g.reprises.length])).toEqual([["2026-11-23", 3], ["2026-11-24", 1]]);
  });
});

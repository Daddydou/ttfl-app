import { describe, it, expect } from "vitest";
import {
  absentsActifs, construireConseilles, etiquetteJour, fusionnerSoiree, joursProposes, nbMatchs, picksAVenir,
  type LigneSoiree,
} from "@/lib/conseilles";
import type { Nuit } from "@/lib/planning";
import type { TtflManualAbsent, TtflProjection } from "@/lib/types";

function proj(player: string, projection: number | null, extra: Partial<TtflProjection> = {}): TtflProjection {
  return {
    id: 0, run_id: 1, rank: 1, player, team: "BOS", opponent: "NYK", position: null, projection,
    forme: 38, ceiling: 45, matchup_factor: 1.02, status: null, is_pick: false, is_urgent: false,
    series_state: null, expected_nights_left: null, explanation: null, ...extra,
  };
}
const ligne = (player: string, projection: number | null, extra: Partial<LigneSoiree> = {}): LigneSoiree => ({
  player, team: "BOS", opponent: "NYK", position: null, projection, forme: 38, ceiling: 45, matchup_factor: 1,
  status: null, is_urgent: false, explanation: null, source: "avance", ...extra,
});
const absent = (player: string, debut: string, fin: string | null): TtflManualAbsent =>
  ({ id: 1, player, date_debut: debut, date_fin: fin, raison: null, created_at: "" });
const EQUIPE = ["03", "04", "05"];

describe("fusionnerSoiree", () => {
  it("sans run du soir : tout le run « à l'avance »", () => {
    const l = fusionnerSoiree([proj("A", 50), proj("B", 40)], []);
    expect(l.map((x) => x.player)).toEqual(["A", "B"]);
    expect(l.every((x) => x.source === "avance")).toBe(true);
  });

  it("avec un run du soir : ne repêche pas un joueur mieux projeté que le Top 10 (il peut être Out)", () => {
    const soir = [proj("B", 48), proj("C", 45)];
    const avance = [proj("StarBlessee", 60), proj("B", 47), proj("C", 44), proj("D", 44.5), proj("E", 30)];
    const noms = fusionnerSoiree(avance, soir).map((x) => x.player);
    expect(noms).not.toContain("StarBlessee");          // 60 > plancher du Top 10 du soir (45) : écarté par le moteur
    expect(noms).toEqual(["B", "C", "D", "E"]);         // D (44,5) et E (30) ≤ 45 : repêchés pour combler les places libérées
  });

  it("le run du soir écrase le run « à l'avance » pour un même joueur (données fraîches)", () => {
    const l = fusionnerSoiree([proj("B", 47)], [proj("B", 48, { status: "Questionable" })]);
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ projection: 48, status: "Questionable", source: "soir" });
  });
});

describe("construireConseilles", () => {
  const date = "2026-10-21";

  it("renvoie les 10 meilleurs, classés, numérotés de 1 à 10", () => {
    const lignes = Array.from({ length: 15 }, (_, i) => ligne(`J${i}`, 30 + i));
    const { conseilles } = construireConseilles({ lignes, comptes: EQUIPE, picks: [], absents: [], date });
    expect(conseilles).toHaveLength(10);
    expect(conseilles[0]).toMatchObject({ player: "J14", rang: 1 });
    expect(conseilles[9]).toMatchObject({ player: "J5", rang: 10 });
  });

  it("retire un joueur déjà pické dans le PASSÉ (≤ 30 jours) sur tous les comptes de la zone", () => {
    const picks = EQUIPE.map((c) => ({ pick_date: "2026-10-10", player: "Star", compte: c }));
    const { conseilles, masques } = construireConseilles({
      lignes: [ligne("Star", 60), ligne("B", 50)], comptes: EQUIPE, picks, absents: [], date,
    });
    expect(conseilles.map((c) => c.player)).toEqual(["B"]);
    expect(masques).toEqual([{ player: "Star", raison: "cycle" }]);
  });

  it("retire aussi un joueur déjà validé dans le FUTUR (≤ 30 jours après)", () => {
    const picks = EQUIPE.map((c) => ({ pick_date: "2026-11-05", player: "Star", compte: c }));
    const { conseilles } = construireConseilles({
      lignes: [ligne("Star", 60), ligne("B", 50)], comptes: EQUIPE, picks, absents: [], date,
    });
    expect(conseilles.map((c) => c.player)).toEqual(["B"]);
  });

  it("ne retire PAS un joueur pické au-delà de 30 jours", () => {
    const picks = EQUIPE.map((c) => ({ pick_date: "2026-09-01", player: "Star", compte: c }));
    const { conseilles } = construireConseilles({
      lignes: [ligne("Star", 60), ligne("B", 50)], comptes: EQUIPE, picks, absents: [], date,
    });
    expect(conseilles.map((c) => c.player)).toEqual(["Star", "B"]);
  });

  it("garde un joueur bloqué sur une PARTIE seulement des comptes, en indiquant lesquels", () => {
    const picks = [{ pick_date: "2026-10-10", player: "Star", compte: "03" }];
    const { conseilles } = construireConseilles({
      lignes: [ligne("Star", 60)], comptes: EQUIPE, picks, absents: [], date,
    });
    expect(conseilles[0]).toMatchObject({ comptesBloques: ["03"], comptesLibres: ["04", "05"] });
  });

  it("le cycle est propre à la zone : un pick du compte 01 ne bloque pas la zone Équipe", () => {
    const picks = [{ pick_date: "2026-10-10", player: "Star", compte: "01" }];
    const { conseilles } = construireConseilles({
      lignes: [ligne("Star", 60)], comptes: EQUIPE, picks, absents: [], date,
    });
    expect(conseilles).toHaveLength(1);
  });

  it("retire les absents actifs (date de début ≤ soirée ≤ date de fin, ou sans fin)", () => {
    const { conseilles, masques } = construireConseilles({
      lignes: [ligne("Blessé", 60), ligne("Aussi", 55), ligne("Ok", 50)], comptes: EQUIPE, picks: [],
      absents: [absent("Blessé", "2026-10-01", null), absent("Aussi", "2026-10-15", "2026-10-25")], date,
    });
    expect(conseilles.map((c) => c.player)).toEqual(["Ok"]);
    expect(masques.map((m) => m.raison)).toEqual(["absent", "absent"]);
  });

  it("ne retire pas un absent dont la période est terminée ou pas commencée", () => {
    const { conseilles } = construireConseilles({
      lignes: [ligne("Fini", 60), ligne("PasEncore", 55)], comptes: EQUIPE, picks: [],
      absents: [absent("Fini", "2026-10-01", "2026-10-20"), absent("PasEncore", "2026-10-22", null)], date,
    });
    expect(conseilles.map((c) => c.player)).toEqual(["Fini", "PasEncore"]);
  });

  it("retire un joueur annoncé Out et reconnaît les noms malgré accents et suffixes", () => {
    const { conseilles } = construireConseilles({
      lignes: [ligne("Luka Dončić", 60), ligne("Out Man", 58, { status: "Out" }), ligne("B", 50)],
      comptes: ["03"], picks: [{ pick_date: "2026-10-10", player: "Luka Doncic", compte: "03" }], absents: [], date,
    });
    expect(conseilles.map((c) => c.player)).toEqual(["B"]);
  });

  it("ne signale que les écartés qui auraient figuré dans la liste", () => {
    const lignes = [...Array.from({ length: 10 }, (_, i) => ligne(`J${i}`, 50 + i)), ligne("Faible", 20, { status: "Out" })];
    const { masques } = construireConseilles({ lignes, comptes: EQUIPE, picks: [], absents: [], date });
    expect(masques).toEqual([]);
  });

  it("ignore les joueurs sans projection", () => {
    const { conseilles } = construireConseilles({
      lignes: [ligne("Sans", null), ligne("B", 50)], comptes: EQUIPE, picks: [], absents: [], date,
    });
    expect(conseilles.map((c) => c.player)).toEqual(["B"]);
  });
});

describe("jours, matchs et picks à venir", () => {
  const nuit = (game_date: string, max = 100): Nuit =>
    ({ mode: "regular", game_date, n_runs: 1, n_soir: 0, max_candidats: max, dernier_calcul: "" });

  it("propose au plus 7 soirées à venir ayant des projections, aujourd'hui compris", () => {
    const nuits = ["2026-10-09", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
      "2026-10-26", "2026-10-27"].map((d) => nuit(d));
    nuits.push(nuit("2026-10-28", 0)); // « aucun match » : jamais proposée
    expect(joursProposes(nuits, "2026-10-20")).toEqual([
      "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26",
    ]);
  });

  it("étiquettes : jour abrégé + date, avec aujourd'hui / demain", () => {
    expect(etiquetteJour("2026-10-20", "2026-10-20")).toMatchObject({ court: expect.stringContaining("20/10"), relatif: "aujourd'hui" });
    expect(etiquetteJour("2026-10-21", "2026-10-20").relatif).toBe("demain");
    expect(etiquetteJour("2026-10-24", "2026-10-20").relatif).toBeNull();
  });

  it("compte les matchs : A–B et B–A font un seul match", () => {
    expect(nbMatchs([
      { team: "BOS", opponent: "NYK" }, { team: "NYK", opponent: "BOS" }, { team: "LAL", opponent: "GSW" },
      { team: null, opponent: null },
    ])).toBe(2);
  });

  it("picks à venir : du plus proche au plus lointain, sans le passé", () => {
    const l = picksAVenir([
      { pick_date: "2026-10-25" }, { pick_date: "2026-10-18" }, { pick_date: "2026-10-20" }, { pick_date: "2026-10-22" },
    ], "2026-10-20");
    expect(l.map((p) => p.pick_date)).toEqual(["2026-10-20", "2026-10-22", "2026-10-25"]);
  });

  it("absentsActifs : fin incluse", () => {
    expect([...absentsActifs([absent("A B", "2026-10-01", "2026-10-21")], "2026-10-21")]).toEqual(["a b"]);
    expect([...absentsActifs([absent("A B", "2026-10-01", "2026-10-21")], "2026-10-22")]).toEqual([]);
  });
});

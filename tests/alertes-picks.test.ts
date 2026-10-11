import { describe, expect, it } from "vitest";
import { alertesPicksDuSoir, messageAlerte } from "@/lib/alertes-picks";
import type { LigneSoiree } from "@/lib/conseilles";

const ligne = (player: string, projection: number, status: string | null = "Available"): LigneSoiree => ({
  player, team: "AAA", opponent: "BBB", position: "G", projection, forme: null, ceiling: null,
  matchup_factor: null, status: status as LigneSoiree["status"], is_urgent: false, explanation: null, source: "soir",
});
const D = "2026-10-20";
const base = {
  date: D, voisins: [], absents: [], runDuSoirDisponible: true,
};

describe("alertesPicksDuSoir", () => {
  it("signale un pick Out et propose le meilleur suivant", () => {
    const a = alertesPicksDuSoir({
      ...base,
      picksDuSoir: [{ pick_date: D, player: "Star", compte: "01" }],
      lignes: [ligne("Star", 60, "Out"), ligne("Bis", 50), ligne("Ter", 40)],
      zones: [{ id: "c01", label: "Compte 1", comptes: ["01"] }],
    });
    expect(a).toHaveLength(1);
    expect(a[0].type).toBe("out");
    expect(a[0].remplacant?.player).toBe("Bis");
  });

  it("ignore un joueur Probable ou Available", () => {
    const a = alertesPicksDuSoir({
      ...base,
      picksDuSoir: [{ pick_date: D, player: "Star", compte: "01" }],
      lignes: [ligne("Star", 60, "Probable")],
      zones: [{ id: "c01", label: "Compte 1", comptes: ["01"] }],
    });
    expect(a).toHaveLength(0);
  });

  it("saute un remplaçant bloqué par le cycle de 30 jours", () => {
    const a = alertesPicksDuSoir({
      ...base,
      voisins: [{ pick_date: "2026-10-10", player: "Bis", compte: "01" }],
      picksDuSoir: [{ pick_date: D, player: "Star", compte: "01" }],
      lignes: [ligne("Star", 60, "Out"), ligne("Bis", 50), ligne("Ter", 40)],
      zones: [{ id: "c01", label: "Compte 1", comptes: ["01"] }],
    });
    expect(a[0].remplacant?.player).toBe("Ter");
  });

  it("signale les comptes sans pick", () => {
    const a = alertesPicksDuSoir({
      ...base,
      picksDuSoir: [{ pick_date: D, player: "Star", compte: "03" }],
      lignes: [ligne("Star", 60), ligne("Bis", 50)],
      zones: [{ id: "equipe", label: "Équipe", comptes: ["03", "04", "05"] }],
    });
    const sans = a.find((x) => x.type === "sans_pick");
    expect(sans?.comptes).toEqual(["04", "05"]);
    expect(messageAlerte(sans!)).toContain("04, 05");
  });

  it("ne dépasse pas la part max d'un même joueur dans l'équipe", () => {
    const comptes = ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    const picks = comptes.slice(0, 6).map((c) => ({ pick_date: D, player: "Bis", compte: c }));
    picks.push({ pick_date: D, player: "Star", compte: "12" });
    const a = alertesPicksDuSoir({
      ...base,
      picksDuSoir: picks,
      lignes: [ligne("Star", 60, "Out"), ligne("Bis", 50), ligne("Ter", 40)],
      zones: [{ id: "equipe", label: "Équipe", comptes }],
    });
    const out = a.find((x) => x.type === "out")!;
    expect(out.remplacant?.player).toBe("Ter"); // Bis est déjà sur 6/10 = plafond
  });

  it("sans run du soir, seul l'absent saisi à la main déclenche", () => {
    const a = alertesPicksDuSoir({
      ...base,
      runDuSoirDisponible: false,
      absents: [{ id: 1, player: "Star", date_debut: D, date_fin: null, raison: null, created_at: "" }],
      picksDuSoir: [{ pick_date: D, player: "Star", compte: "01" }, { pick_date: D, player: "Autre", compte: "02" }],
      lignes: [ligne("Star", 60, "Out"), ligne("Autre", 55, "Out"), ligne("Bis", 50)],
      zones: [
        { id: "c01", label: "Compte 1", comptes: ["01"] },
        { id: "c02", label: "Compte 2", comptes: ["02"] },
      ],
    });
    expect(a.map((x) => x.type)).toEqual(["absent"]);
  });
});

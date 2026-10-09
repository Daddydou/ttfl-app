import { describe, it, expect } from "vitest";
import {
  ZONES,
  zoneDe,
  normaliserNom,
  ajouterJours,
  joursEntre,
  dernierJourDuMois,
  moisDisponibles,
  bloquesPourSoiree,
  resumeZone,
  resumeEnvois,
  avanceSeule,
  aDesProjections,
  type PickLigne,
  type EnvoiLigne,
  type Nuit,
} from "@/lib/planning";

const pick = (pick_date: string, player: string, compte: string): PickLigne => ({ pick_date, player, compte });
const envoi = (compte: string, statut: string, message: string | null = null): EnvoiLigne => ({
  pick_date: "2026-10-20", compte, joueur: "LeBron James", statut, message,
});

describe("zones", () => {
  it("l'équipe regroupe les comptes 03 à 12", () => {
    expect(zoneDe("equipe").comptes).toHaveLength(10);
    expect(zoneDe("equipe").comptes[0]).toBe("03");
    expect(zoneDe("equipe").comptes[9]).toBe("12");
  });
  it("une zone inconnue retombe sur le compte 1", () => {
    expect(zoneDe("nimporte").id).toBe("c01");
    expect(zoneDe(undefined).id).toBe("c01");
    expect(ZONES.map((z) => z.id)).toEqual(["c01", "c02", "equipe"]);
  });
});

describe("normaliserNom", () => {
  it("ignore accents, casse, ponctuation et suffixes", () => {
    expect(normaliserNom("Nikola Jokić")).toBe("nikola jokic");
    expect(normaliserNom("Shai Gilgeous-Alexander")).toBe("shai gilgeous alexander");
    expect(normaliserNom("Jaren Jackson Jr.")).toBe("jaren jackson");
    expect(normaliserNom("  LeBron   JAMES ")).toBe("lebron james");
  });
});

describe("dates", () => {
  it("ajoute des jours et mesure un écart", () => {
    expect(ajouterJours("2026-10-20", 30)).toBe("2026-11-19");
    expect(ajouterJours("2026-10-20", -20)).toBe("2026-09-30");
    expect(joursEntre("2026-10-20", "2026-11-19")).toBe(30);
    expect(joursEntre("2026-11-19", "2026-10-20")).toBe(-30);
  });
  it("trouve le dernier jour d'un mois, bissextile comprise", () => {
    expect(dernierJourDuMois("2026-10")).toBe("2026-10-31");
    expect(dernierJourDuMois("2026-02")).toBe("2026-02-28");
    expect(dernierJourDuMois("2028-02")).toBe("2028-02-29");
  });
  it("propose le mois en cours, le suivant et ceux qui ont des soirées", () => {
    expect(moisDisponibles(["2026-12-03", "2026-10-20"], "2026-10-09")).toEqual(["2026-10", "2026-11", "2026-12"]);
  });
});

describe("bloquesPourSoiree (cycle de 30 jours par compte)", () => {
  const picks = [pick("2026-10-20", "LeBron James", "03"), pick("2026-10-25", "Luka Dončić", "01")];

  it("bloque à 1 jour et à 30 jours, libère à 31 jours", () => {
    expect(bloquesPourSoiree(picks, ["03"], "2026-10-21")["lebron james"]).toEqual(["03"]);
    expect(bloquesPourSoiree(picks, ["03"], "2026-11-19")["lebron james"]).toEqual(["03"]);
    expect(bloquesPourSoiree(picks, ["03"], "2026-11-20")["lebron james"]).toBeUndefined();
  });
  it("vaut aussi dans le sens inverse (pick posé d'avance plus tard)", () => {
    expect(bloquesPourSoiree(picks, ["03"], "2026-10-05")["lebron james"]).toEqual(["03"]);
  });
  it("ignore la soirée elle-même et les comptes hors zone", () => {
    expect(bloquesPourSoiree(picks, ["03"], "2026-10-20")["lebron james"]).toBeUndefined();
    expect(bloquesPourSoiree(picks, ["04", "05"], "2026-10-21")["lebron james"]).toBeUndefined();
  });
  it("regroupe les comptes concernés pour une zone d'équipe", () => {
    const equipe = [pick("2026-10-20", "LeBron James", "03"), pick("2026-10-20", "lebron james", "04")];
    expect(bloquesPourSoiree(equipe, ["03", "04", "05"], "2026-10-22")["lebron james"]).toEqual(["03", "04"]);
  });
});

describe("resumeZone", () => {
  const equipe = ["03", "04", "05"];
  it("aucun pick", () => {
    expect(resumeZone([], equipe, "2026-10-20").etat).toBe("aucun");
  });
  it("tous les comptes sur le même joueur = unique", () => {
    const p = equipe.map((c) => pick("2026-10-20", "LeBron James", c));
    const r = resumeZone(p, equipe, "2026-10-20");
    expect(r.etat).toBe("unique");
    expect(r.joueurs).toEqual([{ player: "LeBron James", n: 3 }]);
  });
  it("un seul joueur mais pas sur tous les comptes = partiel", () => {
    const r = resumeZone([pick("2026-10-20", "LeBron James", "03")], equipe, "2026-10-20");
    expect(r.etat).toBe("partiel");
    expect(r.nPicks).toBe(1);
  });
  it("plusieurs joueurs = mixte, le plus fréquent d'abord", () => {
    const p = [
      pick("2026-10-20", "A", "03"), pick("2026-10-20", "B", "04"), pick("2026-10-20", "B", "05"),
    ];
    const r = resumeZone(p, equipe, "2026-10-20");
    expect(r.etat).toBe("mixte");
    expect(r.joueurs[0]).toEqual({ player: "B", n: 2 });
  });
  it("ne compte que la soirée et les comptes de la zone", () => {
    const p = [pick("2026-10-21", "A", "03"), pick("2026-10-20", "A", "01")];
    expect(resumeZone(p, equipe, "2026-10-20").etat).toBe("aucun");
  });
});

describe("resumeEnvois (ce que le site TTFL a réellement)", () => {
  it("rien du tout", () => {
    expect(resumeEnvois([], 0).etat).toBe("aucun");
  });
  it("pick voulu mais pas encore envoyé", () => {
    expect(resumeEnvois([], 3)).toMatchObject({ etat: "a_envoyer", label: "À envoyer" });
  });
  it("tout confirmé", () => {
    expect(resumeEnvois([envoi("03", "confirme"), envoi("04", "confirme")], 2).etat).toBe("pose");
  });
  it("partiellement confirmé", () => {
    expect(resumeEnvois([envoi("03", "confirme")], 3)).toMatchObject({ etat: "partiel", label: "1/3 posés" });
  });
  it("un conflit l'emporte et remonte son message", () => {
    const r = resumeEnvois([envoi("03", "confirme"), envoi("04", "conflit", "le site a X")], 2);
    expect(r).toMatchObject({ etat: "conflit", detail: "le site a X" });
  });
  it("un échec ou un refus est signalé", () => {
    expect(resumeEnvois([envoi("03", "refuse", "bloqué")], 1)).toMatchObject({ etat: "echec", detail: "bloqué" });
    expect(resumeEnvois([envoi("03", "echec")], 1).etat).toBe("echec");
  });
});

describe("nuits", () => {
  const nuit = (p: Partial<Nuit>): Nuit => ({
    mode: "regular", game_date: "2026-10-20", n_runs: 1, n_soir: 0, max_candidats: 50,
    dernier_calcul: "2026-10-09T16:00:00Z", ...p,
  });
  it("une soirée sans run du soir est « à l'avance seulement »", () => {
    expect(avanceSeule(nuit({ n_soir: 0 }))).toBe(true);
    expect(avanceSeule(nuit({ n_soir: 3 }))).toBe(false);
    expect(avanceSeule(undefined)).toBe(false);
  });
  it("sans candidat, pas de projections", () => {
    expect(aDesProjections(nuit({ max_candidats: 0 }))).toBe(false);
    expect(aDesProjections(nuit({ max_candidats: null }))).toBe(false);
    expect(aDesProjections(nuit({ max_candidats: 12 }))).toBe(true);
    expect(aDesProjections(undefined)).toBe(false);
  });
});

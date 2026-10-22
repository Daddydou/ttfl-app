import { describe, expect, it } from "vitest";
import { etatSante, niveauAge, resumeSante, type LigneEtat } from "@/lib/sante";
import { ACTIONS_CLOUD, ACTIONS_PC } from "@/lib/admin";

const T = Date.parse("2026-10-22T18:00:00Z");
const ilYa = (min: number) => new Date(T - min * 60000).toISOString();

function sources(etats: LigneEtat[], extra: Partial<{ dernierRun: string | null; dernierPlan30: string | null; dernierReleveCotes: string | null }> = {}) {
  return { etats, dernierRun: null, dernierPlan30: null, dernierReleveCotes: null, ...extra };
}

describe("niveauAge", () => {
  it("ok, retard, panne selon les seuils ; info sans seuil ; inconnu sans date", () => {
    expect(niveauAge(5, { retard: 10, panne: 60 })).toBe("ok");
    expect(niveauAge(10, { retard: 10, panne: 60 })).toBe("retard");
    expect(niveauAge(60, { retard: 10, panne: 60 })).toBe("panne");
    expect(niveauAge(5000, {})).toBe("info");
    expect(niveauAge(null, { retard: 10 })).toBe("inconnu");
  });
});

describe("etatSante", () => {
  it("PC muet depuis 2 h : exécuteur du PC à l'arrêt", () => {
    const t = etatSante(sources([{ cle: "commandes", valeur: { dernier_passage: ilYa(120) }, maj_le: ilYa(1) }]), T);
    const pc = t.find((x) => x.id === "commandes")!;
    expect(pc.niveau).toBe("panne"); // la date lue est dernier_passage, pas maj_le
    expect(pc.qui).toBe("PC");
  });

  it("cookies à renouveler = à l'arrêt, avec les comptes concernés", () => {
    const t = etatSante(sources([{ cle: "cookies", valeur: { le: ilYa(30), total: 13, valides: 11, echecs: ["04", "09"] }, maj_le: ilYa(30) }]), T);
    const c = t.find((x) => x.id === "cookies")!;
    expect(c.niveau).toBe("panne");
    expect(c.detail).toContain("04, 09");
  });

  it("cookies valides et récents = OK avec le compte rendu 13/13", () => {
    const t = etatSante(sources([{ cle: "cookies", valeur: { le: ilYa(30), total: 13, valides: 13, echecs: [] }, maj_le: ilYa(30) }]), T);
    const c = t.find((x) => x.id === "cookies")!;
    expect(c.niveau).toBe("ok");
    expect(c.detail).toBe("13/13 valides");
  });

  it("synchro avec erreurs = en retard même si récente", () => {
    const t = etatSante(sources([{ cle: "synchro", valeur: { le: ilYa(5), erreurs: ["x"] }, maj_le: ilYa(5) }]), T);
    expect(t.find((x) => x.id === "synchro")!.niveau).toBe("retard");
  });

  it("projections, Plan 30 et cotes lus dans leurs tables ; jamais vus = inconnu", () => {
    const t = etatSante(sources([], { dernierRun: ilYa(20), dernierPlan30: ilYa(200) }), T);
    expect(t.find((x) => x.id === "run")!.niveau).toBe("ok");
    expect(t.find((x) => x.id === "plan30")!.niveau).toBe("retard");
    expect(t.find((x) => x.id === "cotes")!.niveau).toBe("inconnu");
  });

  it("les tâches du cloud et de Supabase sont informatives (jamais en retard)", () => {
    const t = etatSante(sources([{ cle: "secours", valeur: { le: ilYa(5000) }, maj_le: ilYa(5000) }]), T);
    expect(t.find((x) => x.id === "secours")!.niveau).toBe("info");
    expect(t.find((x) => x.id === "executeur_cloud")!.niveau).toBe("inconnu");
  });
});

describe("resumeSante", () => {
  it("compte les pannes et les retards", () => {
    expect(resumeSante([{ id: "a", titre: "", qui: "PC", derniere: null, niveau: "panne", detail: "" },
      { id: "b", titre: "", qui: "PC", derniere: null, niveau: "retard", detail: "" }]).texte).toBe("1 tâche(s) à l'arrêt, 1 en retard.");
    expect(resumeSante([{ id: "a", titre: "", qui: "PC", derniere: null, niveau: "ok", detail: "" }]).niveau).toBe("ok");
  });
});

describe("actions cloud", () => {
  it("le badge « Cloud » de l'application correspond exactement à la liste de l'exécuteur cloud", () => {
    expect(ACTIONS_PC.filter((a) => a.cloud).map((a) => a.id).sort()).toEqual([...ACTIONS_CLOUD].sort());
  });
});

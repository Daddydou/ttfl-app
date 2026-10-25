import { describe, it, expect } from "vitest";
import {
  bilanPlan,
  decrireReglages,
  fenetre,
  formuleChoisie,
  formulesTriees,
  jourParDefaut,
  joursNonCouverts,
  libelleFormule,
  optionsDates,
  planEquipeParJour,
  planPerime,
  type JourPlan30,
  type TtflPlan30,
} from "@/lib/plan30";

const AUJOURDHUI = "2026-10-20";

function jour(date: string, joueur: string | null, extra: Partial<JourPlan30> = {}): JourPlan30 {
  return {
    date, statut: joueur ? "plan" : "aucun", joueur, equipe: "LAL", adversaire: "GSW", position: "G",
    projection: joueur ? 40 : null, nb_matchs: 1, alternatives: [], ...extra,
  };
}

function plan(profil: string, extra: Partial<TtflPlan30> = {}): TtflPlan30 {
  const jours = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 20 + i)).toISOString().slice(0, 10);
    return jour(d, `Joueur ${i + 1}`, { projection: 50 - i });
  });
  return {
    compte: "01", profil, debut: "2026-10-20", reference: "2026-10-16", calcule_le: "2026-10-16T12:00:00Z",
    total_projection: 1000, reglages: {}, jours, ...extra,
  };
}

describe("formules", () => {
  it("trie par ordre puis met la formule par défaut en tête à égalité", () => {
    const a = plan("a", { reglages: { ordre: 2 } });
    const b = plan("b", { reglages: { ordre: 1 } });
    const c = plan("c", { reglages: { ordre: 2, defaut: true } });
    expect(formulesTriees([a, b, c]).map((p) => p.profil)).toEqual(["b", "c", "a"]);
  });

  it("choisit la formule demandée, sinon la formule par défaut, sinon la première", () => {
    const a = plan("a", { reglages: { ordre: 1 } });
    const b = plan("b", { reglages: { ordre: 2, defaut: true } });
    expect(formuleChoisie([a, b], "a")?.profil).toBe("a");
    expect(formuleChoisie([a, b], "inconnue")?.profil).toBe("b");
    expect(formuleChoisie([a, b], null)?.profil).toBe("b");
    expect(formuleChoisie([a, plan("z", { reglages: { ordre: 5 } })], null)?.profil).toBe("a");
    expect(formuleChoisie([], null)).toBeNull();
  });

  it("n'altère pas la liste reçue", () => {
    const liste = [plan("b", { reglages: { ordre: 2 } }), plan("a", { reglages: { ordre: 1 } })];
    formulesTriees(liste);
    expect(liste.map((p) => p.profil)).toEqual(["b", "a"]);
  });

  it("libellé : celui du moteur, sinon l'identifiant", () => {
    expect(libelleFormule(plan("x", { reglages: { libelle: "Équilibrée" } }))).toBe("Équilibrée");
    expect(libelleFormule(plan("x"))).toBe("x");
  });
});

describe("dates du plan", () => {
  it("jour par défaut : la première soirée non passée, à défaut la dernière", () => {
    const p = plan("a");
    expect(jourParDefaut(p, "2026-10-25")).toBe("2026-10-25");
    expect(jourParDefaut(p, "2027-01-01")).toBe(p.jours[29].date);
    expect(jourParDefaut(plan("a", { jours: [] }), AUJOURDHUI)).toBeNull();
  });

  it("options de la liste déroulante : une par soirée à venir, avec joueur et projection", () => {
    const p = plan("a");
    const opts = optionsDates(p, "2026-10-22");
    expect(opts).toHaveLength(28);
    expect(opts[0].date).toBe("2026-10-22");
    expect(opts[0].resume).toBe("Joueur 3 · 48.0");
    expect(opts[27].date).toBe("2026-11-18");
  });

  it("une soirée sans joueur est signalée", () => {
    const p = plan("a", { jours: [jour("2026-10-20", null)] });
    expect(optionsDates(p, AUJOURDHUI)[0].resume).toBe("aucun joueur");
  });

  it("fenêtre lisible", () => {
    expect(fenetre(plan("a"))).toBe("du 20/10 au 18/11");
    expect(fenetre(plan("a", { jours: [] }))).toBe("");
  });
});

describe("bilan et alertes", () => {
  it("total attendu et soirées validées, soirées passées exclues", () => {
    const p = plan("a", {
      jours: [jour("2026-10-19", "Hier", { projection: 99 }), jour("2026-10-20", "A", { projection: 40, statut: "valide" }),
        jour("2026-10-21", "B", { projection: 35 })],
    });
    expect(bilanPlan(p, AUJOURDHUI)).toEqual({ total: 75, nbValidees: 1, nbSoirees: 2 });
  });

  it("couverture : 0 quand les 30 jours sont là, ou à 2 jours près", () => {
    expect(joursNonCouverts(plan("a"), AUJOURDHUI)).toBe(0);
    const court = plan("a", { jours: plan("a").jours.slice(0, 28) });
    expect(joursNonCouverts(court, AUJOURDHUI)).toBe(0);
  });

  it("couverture : signale les jours manquants en fin de fenêtre", () => {
    const court = plan("a", { jours: plan("a").jours.slice(0, 20) });
    expect(joursNonCouverts(court, AUJOURDHUI)).toBe(10);
    expect(joursNonCouverts(plan("a", { jours: [] }), AUJOURDHUI)).toBe(30);
  });

  it("plan périmé après 30 heures", () => {
    const p = plan("a", { calcule_le: "2026-10-16T12:00:00Z" });
    expect(planPerime(p, Date.parse("2026-10-17T12:00:00Z"))).toBe(false);
    expect(planPerime(p, Date.parse("2026-10-17T19:00:00Z"))).toBe(true);
  });
});

describe("décrire les réglages", () => {
  it("une phrase par poids actif, rien pour un plan neutre", () => {
    expect(decrireReglages({})).toEqual([]);
    expect(decrireReglages({ actualisation: 1, poids_matchup_futur: 1, marge_engagement: null })).toEqual([]);
    const phrases = decrireReglages({ marge_engagement: 5, poids_matchup_futur: 0.5, actualisation: 0.995 });
    expect(phrases).toHaveLength(3);
    expect(phrases[0]).toMatch(/5 pts de moins/);
    expect(phrases[1]).toMatch(/50 %/);
    expect(phrases[2]).toMatch(/0\.5 %/);
  });

  it("marge nulle : toujours le meilleur du soir", () => {
    expect(decrireReglages({ marge_engagement: 0 })[0]).toMatch(/meilleur disponible/);
  });
});

describe("plan de l'équipe (comptes 03 à 12)", () => {
  const jours = (date: string, joueur: string | null, projection = 40) => [
    jour(date, joueur, { projection: joueur ? projection : null }),
  ];
  const planCompte = (compte: string, parDate: Record<string, string | null>, projection = 40): TtflPlan30 => ({
    ...plan("prudent"),
    compte,
    reglages: { equipe: true } as TtflPlan30["reglages"],
    jours: Object.entries(parDate).flatMap(([d, j]) => jours(d, j, projection)),
  });

  it("regroupe par joueur, le plus pris d'abord, et ignore les soirées passées", () => {
    const plans = [
      planCompte("03", { "2026-10-19": "Vieux", "2026-10-20": "Alpha", "2026-10-21": "Gamma" }),
      planCompte("04", { "2026-10-20": "Alpha", "2026-10-21": "Beta" }, 45),
      planCompte("05", { "2026-10-20": "Beta", "2026-10-21": "Beta" }, 30),
    ];
    const r = planEquipeParJour(plans, "2026-10-20");
    expect(r.map((j) => j.date)).toEqual(["2026-10-20", "2026-10-21"]);
    expect(r[0].groupes.map((g) => [g.joueur, g.comptes])).toEqual([
      ["Alpha", ["03", "04"]],
      ["Beta", ["05"]],
    ]);
    expect(r[1].groupes[0]).toMatchObject({ joueur: "Beta", comptes: ["04", "05"] });
  });

  it("signale les comptes sans joueur possible", () => {
    const r = planEquipeParJour([planCompte("03", { "2026-10-20": "Alpha" }), planCompte("04", { "2026-10-20": null })], "2026-10-20");
    expect(r[0].sansJoueur).toEqual(["04"]);
    expect(r[0].groupes).toHaveLength(1);
  });

  it("aucun plan = aucune soirée", () => {
    expect(planEquipeParJour([], "2026-10-20")).toEqual([]);
  });
});

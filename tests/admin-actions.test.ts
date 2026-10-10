import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Faux client Supabase qui ENREGISTRE chaque écriture (insert / upsert / update / delete) avec ses filtres.
type Ecriture = { table: string; op: string; payload?: unknown; filtres: Record<string, unknown>; options?: unknown };
let tables: Record<string, unknown[]> = {};
let journal: Ecriture[] = [];

function from(table: string) {
  const filtres: Record<string, unknown> = {};
  const resultat = () => ({ data: tables[table] ?? [], error: null });
  const q: Record<string, unknown> = { then: (ok: (v: unknown) => unknown) => ok(resultat()), returns: () => q };
  for (const m of ["select", "order", "limit"]) q[m] = () => q;
  for (const m of ["eq", "in", "gte", "lte", "lt"]) q[`${m}`] = (col: string, val: unknown) => { filtres[`${m}:${col}`] = val; return q; };
  const ecrire = (op: string) => (payload?: unknown, options?: unknown) => {
    journal.push({ table, op, payload, filtres, options });
    return q;
  };
  q.insert = ecrire("insert");
  q.upsert = ecrire("upsert");
  q.update = ecrire("update");
  q.delete = () => ecrire("delete")();
  return q;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const A = await import("@/app/(app)/admin/actions");

beforeEach(() => {
  tables = {};
  journal = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T16:00:00Z")); // samedi 10/10/2026 à New York
});
afterEach(() => vi.useRealTimers());

const ecritures = (op: string) => journal.filter((j) => j.op === op);
const EQUIPE = ["03", "04", "05"];
const lignes = [{ date: "2026-10-21", player: "Nikola Jokic" }, { date: "2026-10-25", player: "Luka Doncic" }];

describe("lancerCommande", () => {
  it("refuse une action inconnue : rien n'est déposé", async () => {
    const r = await A.lancerCommande("format_c", {});
    expect(r).toEqual({ ok: false, error: "Action inconnue." });
    expect(journal).toEqual([]);
  });

  it("refuse un paramètre invalide (date réelle, entier borné)", async () => {
    expect(await A.lancerCommande("push_soir", { date: "2026-02-30" })).toMatchObject({ ok: false });
    expect(await A.lancerCommande("push_soir", { date: "2026-10-20; calc" })).toMatchObject({ ok: false });
    expect(await A.lancerCommande("push_avance", { nuits: 99 })).toMatchObject({ ok: false });
    expect(journal).toEqual([]);
  });

  it("refuse un doublon : la même action est déjà en attente ou en cours", async () => {
    tables.ttfl_commandes = [{ id: 5 }];
    const r = await A.lancerCommande("calendrier", {});
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/déjà en attente ou en cours/) });
    expect(ecritures("insert")).toHaveLength(0);
  });

  it("dépose la demande avec le type et les paramètres NETTOYÉS (pas de champ en trop)", async () => {
    const r = await A.lancerCommande("push_soir", { date: "2026-10-20", extra: "--evil" });
    expect(r.ok).toBe(true);
    expect(ecritures("insert")).toHaveLength(1);
    expect(ecritures("insert")[0].payload).toEqual({ type: "push_soir", params: { date: "2026-10-20" } });
  });
});

describe("annulerCommande", () => {
  it("n'annule QUE une demande encore en attente", async () => {
    await A.annulerCommande(7);
    const e = ecritures("update")[0];
    expect(e.filtres).toMatchObject({ "eq:id": 7, "eq:statut": "en_attente" });
    expect((e.payload as { statut: string }).statut).toBe("annule");
  });
  it("refuse un identifiant invalide", async () => {
    expect(await A.annulerCommande(-1)).toMatchObject({ ok: false });
    expect(journal).toEqual([]);
  });
});

describe("importerPicks", () => {
  it("refuse hors saison régulière", async () => {
    expect(await A.importerPicks("playoffs", lignes, EQUIPE, true)).toMatchObject({ ok: false });
    expect(journal).toEqual([]);
  });

  it("« Vérifier » (ecrire = false) n'écrit RIEN et annonce ce qui serait fait", async () => {
    const r = await A.importerPicks("regular", lignes, EQUIPE, false);
    expect(r).toMatchObject({ ok: true, message: expect.stringMatching(/Vérifié : 6 pick\(s\) seraient importé\(s\) sur 3 compte/) });
    expect(ecritures("upsert")).toHaveLength(0);
  });

  it("écrit chaque pick sur chaque compte, source « app », en remplaçant par (mode, date, compte)", async () => {
    const r = await A.importerPicks("regular", lignes, EQUIPE, true);
    expect(r).toMatchObject({ ok: true, message: expect.stringMatching(/6 pick\(s\) importé\(s\) sur 3 compte/) });
    const up = ecritures("upsert")[0];
    expect(up.options).toEqual({ onConflict: "mode,pick_date,compte" });
    const rows = up.payload as { mode: string; pick_date: string; player: string; compte: string; source: string }[];
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.mode === "regular" && r.source === "app")).toBe(true);
    expect(rows.filter((r) => r.compte === "04").map((r) => [r.pick_date, r.player])).toEqual([
      ["2026-10-21", "Nikola Jokic"], ["2026-10-25", "Luka Doncic"],
    ]);
  });

  it("n'écrit PAS, pour un compte, un joueur déjà pické à ≤ 30 jours ; les autres comptes sont écrits", async () => {
    tables.ttfl_picks = [{ pick_date: "2026-10-12", player: "Nikola Jokic", compte: "03" }];
    const r = await A.importerPicks("regular", lignes, EQUIPE, true);
    expect(r).toMatchObject({ ok: true, message: expect.stringMatching(/1 refusé\(s\) par le cycle/) });
    const rows = ecritures("upsert")[0].payload as { pick_date: string; compte: string }[];
    expect(rows).toHaveLength(5);
    expect(rows.some((x) => x.compte === "03" && x.pick_date === "2026-10-21")).toBe(false);
    expect((r as { details: string[] }).details[0]).toMatch(/compte 03 · Nikola Jokic/);
  });

  it("tout refusé par le cycle : erreur claire, aucune écriture", async () => {
    tables.ttfl_picks = EQUIPE.map((c) => ({ pick_date: "2026-10-12", player: "Nikola Jokic", compte: c }));
    const r = await A.importerPicks("regular", [lignes[0]], EQUIPE, true);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/Rien à écrire/) });
    expect(ecritures("upsert")).toHaveLength(0);
  });

  it("refuse les entrées invalides : date impossible, joueur vide, dates en double, aucun compte, comptes inconnus", async () => {
    expect(await A.importerPicks("regular", [{ date: "2026-02-30", player: "A Bb" }], EQUIPE, true)).toMatchObject({ ok: false });
    expect(await A.importerPicks("regular", [{ date: "2026-10-21", player: " " }], EQUIPE, true)).toMatchObject({ ok: false });
    expect(await A.importerPicks("regular", [lignes[0], { date: "2026-10-21", player: "Autre Joueur" }], EQUIPE, true)).toMatchObject({ ok: false });
    expect(await A.importerPicks("regular", lignes, [], true)).toMatchObject({ ok: false });
    expect(await A.importerPicks("regular", lignes, ["03", "13"], true)).toMatchObject({ ok: false });
    expect(await A.importerPicks("regular", [], EQUIPE, true)).toMatchObject({ ok: false });
    expect(journal).toEqual([]);
  });
});

describe("copierPicks", () => {
  it("copie les picks du compte source vers les destinations seulement (jamais vers la source)", async () => {
    tables.ttfl_picks = [
      { pick_date: "2026-10-21", player: "Nikola Jokic", compte: "03" },
      { pick_date: "2026-10-25", player: "Luka Doncic", compte: "03" },
    ];
    const r = await A.copierPicks("regular", "03", ["03", "04", "05"], "2026-10-10", "2026-11-09", true);
    expect(r.ok).toBe(true);
    const rows = ecritures("upsert")[0].payload as { compte: string }[];
    expect([...new Set(rows.map((x) => x.compte))].sort()).toEqual(["04", "05"]);
    expect(rows).toHaveLength(4);
  });

  it("source sans pick sur la période : erreur, aucune écriture", async () => {
    const r = await A.copierPicks("regular", "03", ["04"], "2026-10-10", "2026-11-09", true);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/n'a aucun pick/) });
    expect(journal).toEqual([]);
  });

  it("refuse sans destination valide ou avec une plage inversée", async () => {
    expect(await A.copierPicks("regular", "03", ["03"], "2026-10-10", "2026-11-09", true)).toMatchObject({ ok: false });
    expect(await A.copierPicks("regular", "03", ["04"], "2026-11-09", "2026-10-10", true)).toMatchObject({ ok: false });
  });
});

describe("supprimerPicks", () => {
  beforeEach(() => { tables.ttfl_picks = [{ id: 1, pick_date: "2026-10-21", compte: "03" }, { id: 2, pick_date: "2026-10-22", compte: "03" }]; });

  it("protège l'historique : refuse toute plage qui commence dans le passé", async () => {
    const r = await A.supprimerPicks("regular", ["03"], "2026-10-09", "2026-10-30", "SUPPRIMER", true);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/historique/) });
    expect(ecritures("delete")).toHaveLength(0);
  });

  it("exige le mot SUPPRIMER pour écrire", async () => {
    for (const mauvais of ["", "supprimer", "OUI", "SUPPRIMER !"]) {
      expect(await A.supprimerPicks("regular", ["03"], "2026-10-10", "2026-11-09", mauvais, true), mauvais).toMatchObject({ ok: false });
    }
    expect(ecritures("delete")).toHaveLength(0);
  });

  it("« Vérifier » compte ce qui serait supprimé, sans rien supprimer", async () => {
    const r = await A.supprimerPicks("regular", ["03"], "2026-10-10", "2026-11-09", "", false);
    expect(r).toMatchObject({ ok: true, message: expect.stringMatching(/2 pick\(s\) sur 1 compte/) });
    expect(ecritures("delete")).toHaveLength(0);
  });

  it("supprime avec les bons filtres : mode, comptes choisis et plage de dates", async () => {
    const r = await A.supprimerPicks("regular", ["03", "04"], "2026-10-10", "2026-11-09", "SUPPRIMER", true);
    expect(r.ok).toBe(true);
    const d = ecritures("delete")[0];
    expect(d.table).toBe("ttfl_picks");
    expect(d.filtres).toMatchObject({
      "eq:mode": "regular", "in:compte": ["03", "04"], "gte:pick_date": "2026-10-10", "lte:pick_date": "2026-11-09",
    });
  });

  it("aucun pick sur la plage : erreur, aucune suppression", async () => {
    tables.ttfl_picks = [];
    expect(await A.supprimerPicks("regular", ["03"], "2026-10-10", "2026-11-09", "SUPPRIMER", true)).toMatchObject({ ok: false });
    expect(ecritures("delete")).toHaveLength(0);
  });

  it("refuse hors saison régulière", async () => {
    expect(await A.supprimerPicks("playoffs", ["03"], "2026-10-10", "2026-11-09", "SUPPRIMER", true)).toMatchObject({ ok: false });
  });
});

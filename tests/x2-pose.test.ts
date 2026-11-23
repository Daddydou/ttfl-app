import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// x2 posé à la main partout où l'on pose / modifie un joueur (23/11/2026) : en même temps que le pick (pickPlayerComptes,
// pickRepartition), sur un pick déjà posé (poserX2Comptes) et depuis Admin → x2 (poserX2). Le x2 est vérifié AVANT d'écrire
// le pick : refusé = aucun pick enregistré.
type Ecriture = { table: string; valeur: unknown; options?: unknown };
const ecritures: Ecriture[] = [];
let lignesX2: Record<string, unknown>[] = [];
let picks: { compte: string; player: string; pick_date?: string }[] = [];
let reglage: { mode: string; comptes_reels: string[] } = { mode: "reel", comptes_reels: ["03"] };

function donnees(table: string): unknown[] {
  if (table === "ttfl_x2") return lignesX2;
  if (table === "ttfl_picks") return picks;
  return [];
}

function from(table: string) {
  const q: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => resolve({ data: donnees(table), error: null }),
    returns: () => q,
    upsert: async (valeur: unknown, options: unknown) => {
      ecritures.push({ table, valeur, options });
      return { error: null };
    },
    delete: () => {
      const d: Record<string, unknown> = {
        eq: () => d,
        in: () => d,
        then: (resolve: (v: unknown) => unknown) => resolve({ error: null }),
      };
      return d;
    },
  };
  for (const m of ["select", "eq", "in", "gte", "lte", "order"]) q[m] = () => q;
  q.maybeSingle = async () => ({
    data:
      table === "ttfl_secret_reglage"
        ? { id: 1, actif: false, compte: "02", profil: "prudent" }
        : table === "ttfl_x2_reglage"
          ? reglage
          : table === "ttfl_picks"
            ? (picks[0] ?? null)
            : null,
    error: null,
  });
  return q;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { pickPlayerComptes, pickRepartition, verrouillerPickManuel } = await import("@/app/actions");
const { poserX2, poserX2Comptes } = await import("@/app/(app)/admin/x2-actions");

const DATE = "2026-12-15";
const x2Ecrits = () => ecritures.filter((e) => e.table === "ttfl_x2");
const picksEcrits = () => ecritures.filter((e) => e.table === "ttfl_picks");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-23T12:00:00Z"));
  ecritures.length = 0;
  lignesX2 = [];
  picks = [];
  reglage = { mode: "reel", comptes_reels: ["03"] };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("x2 posé en même temps que le pick", () => {
  it("avecX2 : le pick PUIS le x2 du mois sont écrits pour chaque compte", async () => {
    const res = await pickPlayerComptes("regular", DATE, "Luka Dončić", ["03", "04"], true);
    expect(res.ok).toBe(true);
    expect(picksEcrits()).toHaveLength(1);
    const [x2] = x2Ecrits();
    expect(x2.options).toEqual({ onConflict: "mode,compte,mois" });
    expect(x2.valeur).toEqual([
      expect.objectContaining({ compte: "03", mois: "2026-12", pick_date: DATE, player: "Luka Dončić", statut: "voulu", source: "app" }),
      expect.objectContaining({ compte: "04", mois: "2026-12", pick_date: DATE, player: "Luka Dončić", statut: "voulu", source: "app" }),
    ]);
    // 03 est actif en réel, 04 non : le message le dit pour chacun.
    expect(res.ok && res.message).toMatch(/demandé pour le compte 03/);
    expect(res.ok && res.message).toMatch(/enregistré pour le compte 04, mais le robot n'agit pas encore/);
  });

  it("sans avecX2 : aucun x2 n'est écrit (comportement d'avant)", async () => {
    const res = await pickPlayerComptes("regular", DATE, "Luka Dončić", ["03"]);
    expect(res.ok).toBe(true);
    expect(x2Ecrits()).toHaveLength(0);
  });

  it("x2 refusé (joueur déjà x2 un autre mois sur ce compte) : AUCUN pick n'est enregistré", async () => {
    lignesX2 = [{ compte: "03", mois: "2026-11", player: "Luka Dončić", statut: "pose", date_site: "2026-11-09" }];
    const res = await pickPlayerComptes("regular", DATE, "Luka Dončić", ["03"], true);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error).toMatch(/déjà reçu un x2/);
    expect(picksEcrits()).toHaveLength(0);
    expect(x2Ecrits()).toHaveLength(0);
  });

  it("soirée passée ou hors saison : x2 refusé, pick non enregistré", async () => {
    const passee = await pickPlayerComptes("regular", "2026-11-20", "Luka Dončić", ["03"], true);
    expect(!passee.ok && passee.error).toMatch(/passée/);
    const horsSaison = await pickPlayerComptes("regular", "2026-10-30", "Luka Dončić", ["03"], true);
    expect(!horsSaison.ok && horsSaison.error).toMatch(/novembre/);
    expect(picksEcrits()).toHaveLength(0);
  });

  it("le x2 déjà prévu ce mois-ci est DÉPLACÉ : on garde sa date_site pour que le robot le retire de l'ancienne soirée", async () => {
    lignesX2 = [{ compte: "03", mois: "2026-12", player: "Autre Joueur", statut: "pose", date_site: "2026-12-02" }];
    const res = await pickPlayerComptes("regular", DATE, "Luka Dončić", ["03"], true);
    expect(res.ok).toBe(true);
    expect(x2Ecrits()[0].valeur).toEqual([expect.objectContaining({ compte: "03", pick_date: DATE, date_site: "2026-12-02" })]);
  });

  it("compte 02 / 13 « Valider à la main » : le x2 suit le pick", async () => {
    const res = await verrouillerPickManuel("regular", DATE, "Luka Dončić", "13", true);
    expect(res.ok).toBe(true);
    expect(x2Ecrits()[0].valeur).toEqual([expect.objectContaining({ compte: "13", player: "Luka Dončić" })]);
  });
});

describe("x2 sur une répartition de l'équipe", () => {
  it("seuls les comptes demandés reçoivent le x2, avec leur propre joueur", async () => {
    const res = await pickRepartition(
      "regular",
      DATE,
      [
        { player: "Alpha Joueur", comptes: ["03", "04"] },
        { player: "Beta Joueur", comptes: ["05"] },
      ],
      ["05", "04"],
    );
    expect(res.ok).toBe(true);
    expect(x2Ecrits()[0].valeur).toEqual([
      expect.objectContaining({ compte: "04", player: "Alpha Joueur" }),
      expect.objectContaining({ compte: "05", player: "Beta Joueur" }),
    ]);
  });

  it("sans compte demandé : aucun x2", async () => {
    const res = await pickRepartition("regular", DATE, [{ player: "Alpha Joueur", comptes: ["03"] }]);
    expect(res.ok).toBe(true);
    expect(x2Ecrits()).toHaveLength(0);
  });
});

describe("x2 sur un pick déjà posé (bouton « ×2 »)", () => {
  it("pose le x2 sur les picks existants et signale les comptes sans pick", async () => {
    picks = [{ compte: "03", player: "Luka Dončić" }];
    const res = await poserX2Comptes(DATE, ["03", "04"]);
    expect(res.ok).toBe(true);
    expect(x2Ecrits()[0].valeur).toEqual([expect.objectContaining({ compte: "03", player: "Luka Dončić", pick_date: DATE })]);
    expect(res.ok && res.message).toMatch(/Sans pick, ignoré : 04/);
    expect(picksEcrits()).toHaveLength(0); // le joueur ne change pas
  });

  it("aucun pick sur la soirée : refus clair, rien d'écrit", async () => {
    const res = await poserX2Comptes(DATE, ["03"]);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error).toMatch(/d'abord un pick/);
    expect(x2Ecrits()).toHaveLength(0);
  });

  it("joueur déjà x2 un autre mois : refusé", async () => {
    picks = [{ compte: "03", player: "Luka Dončić" }];
    lignesX2 = [{ compte: "03", mois: "2026-11", player: "Luka Dončić", statut: "voulu", date_site: null }];
    const res = await poserX2Comptes(DATE, ["03"]);
    expect(!res.ok && res.error).toMatch(/compte 03/);
    expect(x2Ecrits()).toHaveLength(0);
  });

  it("Admin → x2 (poserX2) marche toujours pour un compte", async () => {
    picks = [{ compte: "03", player: "Luka Dončić" }];
    const res = await poserX2("03", DATE);
    expect(res.ok).toBe(true);
    expect(res.ok && res.message).toMatch(/le robot le pose sur le site dans les 10 minutes/);
    expect(x2Ecrits()).toHaveLength(1);
  });
});

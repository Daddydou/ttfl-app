import { describe, it, expect, vi, beforeEach } from "vitest";

type Ecriture = { op: "upsert" | "delete"; table: string; valeur?: unknown; options?: unknown; filtres: unknown[][] };
const ecritures: Ecriture[] = [];
let voisins: unknown[] = [];
let erreurVerrou: string | null = null;

function from(table: string) {
  const filtres: unknown[][] = [];
  const resultat = () => ({ data: table === "ttfl_picks" ? voisins : [], error: null });
  const q: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => resolve(resultat()),
    returns: () => q,
    upsert: async (valeur: unknown, options: unknown) => {
      ecritures.push({ op: "upsert", table, valeur, options, filtres });
      return { error: table === "ttfl_verrous_pick" && erreurVerrou ? { message: erreurVerrou } : null };
    },
    delete: () => {
      const d: Record<string, unknown> = {
        eq: (...a: unknown[]) => { filtres.push(a); return d; },
        then: (resolve: (v: unknown) => unknown) => {
          ecritures.push({ op: "delete", table, filtres });
          return resolve({ error: null });
        },
      };
      return d;
    },
  };
  for (const m of ["select", "eq", "in", "gte", "lte"]) q[m] = () => q;
  return q;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { verrouillerPickManuel, deverrouillerPickManuel } = await import("@/app/actions");

beforeEach(() => {
  ecritures.length = 0;
  voisins = [];
  erreurVerrou = null;
});

describe("verrouillerPickManuel (compte 02)", () => {
  it("pose le pick sur le compte 02 puis écrit le verrou", async () => {
    const res = await verrouillerPickManuel("regular", "2026-10-20", " Shai Gilgeous-Alexander ");
    expect(res.ok).toBe(true);
    const [pick, verrou] = ecritures;
    expect(pick.table).toBe("ttfl_picks");
    expect(pick.valeur).toEqual([
      { mode: "regular", pick_date: "2026-10-20", player: "Shai Gilgeous-Alexander", compte: "02", source: "app" },
    ]);
    expect(verrou.table).toBe("ttfl_verrous_pick");
    expect(verrou.valeur).toEqual({ compte: "02", pick_date: "2026-10-20", joueur: "Shai Gilgeous-Alexander" });
    expect(verrou.options).toEqual({ onConflict: "compte,pick_date" });
  });

  it("refuse un joueur déjà pické à 30 jours ou moins sur le compte 02 : ni pick ni verrou", async () => {
    voisins = [{ pick_date: "2026-10-05", player: "Shai Gilgeous-Alexander", compte: "02" }];
    const res = await verrouillerPickManuel("regular", "2026-10-20", "Shai Gilgeous-Alexander");
    expect(res.ok).toBe(false);
    expect(ecritures).toEqual([]);
  });

  it("refuse une date ou un joueur invalide sans rien écrire", async () => {
    expect((await verrouillerPickManuel("regular", "20/10/2026", "Shai")).ok).toBe(false);
    expect((await verrouillerPickManuel("regular", "2026-10-20", "   ")).ok).toBe(false);
    expect(ecritures).toEqual([]);
  });

  it("remonte l'erreur d'écriture du verrou", async () => {
    erreurVerrou = "permission denied";
    const res = await verrouillerPickManuel("regular", "2026-10-20", "Shai Gilgeous-Alexander");
    expect(res).toEqual({ ok: false, error: "permission denied" });
  });
});

describe("deverrouillerPickManuel", () => {
  it("supprime le verrou du compte 02 pour cette soirée seulement", async () => {
    const res = await deverrouillerPickManuel("2026-10-20");
    expect(res.ok).toBe(true);
    expect(ecritures).toHaveLength(1);
    expect(ecritures[0]).toMatchObject({ op: "delete", table: "ttfl_verrous_pick" });
    expect(ecritures[0].filtres).toEqual([["compte", "02"], ["pick_date", "2026-10-20"]]);
  });

  it("refuse une date invalide", async () => {
    expect((await deverrouillerPickManuel("demain")).ok).toBe(false);
    expect(ecritures).toEqual([]);
  });
});

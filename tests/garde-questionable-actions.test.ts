import { describe, it, expect, vi, beforeEach } from "vitest";

// Exemption « Questionable posé à la main » (18/11/2026) : à l'enregistrement d'un pick, on note (ou on efface) la ligne
// ttfl_garde_questionable selon le statut du joueur AU MOMENT de la pose.
type Ecriture = { op: "upsert" | "delete"; table: string; valeur?: unknown; options?: unknown; filtres: unknown[][] };
const ecritures: Ecriture[] = [];
let historique: { game_date: string; joueur_norm: string; statut: string }[] = [];
let erreurGarde = false;

function from(table: string) {
  const filtres: unknown[][] = [];
  const q: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: table === "ttfl_blesses_historique" ? historique : [], error: null }),
    returns: () => q,
    upsert: async (valeur: unknown, options: unknown) => {
      ecritures.push({ op: "upsert", table, valeur, options, filtres });
      return { error: table === "ttfl_garde_questionable" && erreurGarde ? { message: "table absente" } : null };
    },
    delete: () => {
      const d: Record<string, unknown> = {
        eq: (...a: unknown[]) => { filtres.push(a); return d; },
        in: (...a: unknown[]) => { filtres.push(a); return d; },
        then: (resolve: (v: unknown) => unknown) => {
          ecritures.push({ op: "delete", table, filtres });
          return resolve({ error: null });
        },
      };
      return d;
    },
  };
  for (const m of ["select", "eq", "in", "gte", "lte", "order"]) q[m] = () => q;
  q.maybeSingle = async () => ({ data: table === "ttfl_secret_reglage" ? { id: 1, actif: false, compte: "02", profil: "prudent" } : null, error: null });
  return q;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { pickPlayerComptes, pickRepartition, retirerPickComptes } = await import("@/app/actions");

const gardes = () => ecritures.filter((e) => e.table === "ttfl_garde_questionable");

beforeEach(() => {
  ecritures.length = 0;
  historique = [];
  erreurGarde = false;
});

describe("exemption Questionable à la pose", () => {
  it("joueur DÉJÀ Questionable à la pose : une ligne d'exemption par compte", async () => {
    historique = [{ game_date: "2026-11-18", joueur_norm: "lukadoncic", statut: "Questionable" }];
    const res = await pickPlayerComptes("regular", "2026-11-18", "Luka Dončić", ["01", "03"]);
    expect(res.ok).toBe(true);
    const [g] = gardes();
    expect(g.op).toBe("upsert");
    expect(g.valeur).toEqual([
      { mode: "regular", pick_date: "2026-11-18", compte: "01", joueur: "Luka Dončić" },
      { mode: "regular", pick_date: "2026-11-18", compte: "03", joueur: "Luka Dončić" },
    ]);
    expect(g.options).toEqual({ onConflict: "mode,pick_date,compte" });
  });

  it("joueur sain à la pose : aucune exemption, l'ancienne ligne est effacée", async () => {
    historique = [{ game_date: "2026-11-18", joueur_norm: "lukadoncic", statut: "Aucun" }];
    await pickPlayerComptes("regular", "2026-11-18", "Luka Dončić", ["01"]);
    const [g] = gardes();
    expect(g.op).toBe("delete");
    expect(g.filtres).toContainEqual(["pick_date", "2026-11-18"]);
    expect(g.filtres).toContainEqual(["compte", ["01"]]);
  });

  it("devenu Out depuis : pas d'exemption (dernier statut gagne)", async () => {
    historique = [
      { game_date: "2026-11-18", joueur_norm: "lukadoncic", statut: "Questionable" },
      { game_date: "2026-11-18", joueur_norm: "lukadoncic", statut: "Out" },
    ];
    await pickPlayerComptes("regular", "2026-11-18", "Luka Dončić", ["01"]);
    expect(gardes().every((g) => g.op === "delete")).toBe(true);
  });

  it("l'échec de l'exemption n'empêche jamais d'enregistrer le pick", async () => {
    historique = [{ game_date: "2026-11-18", joueur_norm: "lukadoncic", statut: "Questionable" }];
    erreurGarde = true;
    const res = await pickPlayerComptes("regular", "2026-11-18", "Luka Dončić", ["01"]);
    expect(res.ok).toBe(true);
    expect(ecritures.some((e) => e.table === "ttfl_picks")).toBe(true);
  });

  it("répartition : seuls les joueurs Questionable sont exemptés, compte par compte", async () => {
    historique = [{ game_date: "2026-11-18", joueur_norm: "alphajoueur", statut: "Questionable" }];
    const res = await pickRepartition("regular", "2026-11-18", [
      { player: "Alpha Joueur", comptes: ["03", "04"] },
      { player: "Beta Joueur", comptes: ["05"] },
    ]);
    expect(res.ok).toBe(true);
    const ups = gardes().find((g) => g.op === "upsert");
    expect(ups?.valeur).toEqual([
      { mode: "regular", pick_date: "2026-11-18", compte: "03", joueur: "Alpha Joueur" },
      { mode: "regular", pick_date: "2026-11-18", compte: "04", joueur: "Alpha Joueur" },
    ]);
    const del = gardes().find((g) => g.op === "delete");
    expect(del?.filtres).toContainEqual(["compte", ["05"]]);
  });

  it("retirer un pick efface son exemption", async () => {
    await retirerPickComptes("regular", "2026-11-18", ["01"]);
    expect(gardes().some((g) => g.op === "delete")).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const ecritures: { table: string; valeur: unknown; options: unknown }[] = [];
let match: { commence_time: string; favori: "dom" | "ext" | null } | null = null;

function from(table: string) {
  const q: Record<string, unknown> = {
    select: () => q,
    eq: () => q,
    maybeSingle: async () => ({ data: match, error: null }),
    upsert: async (valeur: unknown, options: unknown) => {
      ecritures.push({ table, valeur, options });
      return { error: null };
    },
  };
  return q;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { choisirVainqueur, revenirAuFavori } = await import("@/app/actions");

const FUTUR = () => new Date(Date.now() + 3600_000).toISOString();
const PASSE = () => new Date(Date.now() - 3600_000).toISOString();

beforeEach(() => {
  ecritures.length = 0;
  match = null;
});

describe("choisirVainqueur", () => {
  it("écrit un choix MANUEL tant que le match n'a pas commencé", async () => {
    match = { commence_time: FUTUR(), favori: "dom" };
    const res = await choisirVainqueur("e1", "ext");
    expect(res.ok).toBe(true);
    expect(ecritures[0].table).toBe("ttfl_vainqueurs_choix");
    expect(ecritures[0].valeur).toMatchObject({ event_id: "e1", choix: "ext", source: "manuel" });
    expect(ecritures[0].options).toEqual({ onConflict: "event_id" });
  });

  it("refuse une fois le match commencé", async () => {
    match = { commence_time: PASSE(), favori: "dom" };
    const res = await choisirVainqueur("e1", "ext");
    expect(res).toEqual({ ok: false, error: "Le match a commencé : le pronostic est fermé." });
    expect(ecritures).toEqual([]);
  });

  it("refuse un match inconnu ou un choix invalide", async () => {
    expect((await choisirVainqueur("e1", "dom")).ok).toBe(false);
    // @ts-expect-error valeur volontairement invalide
    expect((await choisirVainqueur("e1", "nul")).ok).toBe(false);
    expect(ecritures).toEqual([]);
  });
});

describe("revenirAuFavori", () => {
  it("remet le favori en source auto", async () => {
    match = { commence_time: FUTUR(), favori: "dom" };
    expect((await revenirAuFavori("e1")).ok).toBe(true);
    expect(ecritures[0].valeur).toMatchObject({ event_id: "e1", choix: "dom", source: "auto" });
  });

  it("sans favori connu ou match commencé : rien n'est écrit", async () => {
    match = { commence_time: FUTUR(), favori: null };
    expect((await revenirAuFavori("e1")).ok).toBe(false);
    match = { commence_time: PASSE(), favori: "dom" };
    expect((await revenirAuFavori("e1")).ok).toBe(false);
    expect(ecritures).toEqual([]);
  });
});

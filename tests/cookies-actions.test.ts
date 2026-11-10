// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Le bouton « renouveler un cookie » écrit un SECRET GitHub : seul le propriétaire a le droit de l'utiliser.
// Le projet Supabase accepte des connexions anonymes, donc « connecté » ne suffit pas.
const PROPRIETAIRE = "fd0b91ef-3a4e-4c0c-8c62-3cb235d77901";
let utilisateur: { id: string; is_anonymous?: boolean } | null = null;
const poserSecretCookie = vi.fn(async () => ({ ok: true as const }));
const ecritures: string[] = [];

function from(table: string) {
  const q: Record<string, unknown> = { then: (ok: (v: unknown) => unknown) => ok({ data: [], error: null }) };
  for (const m of ["select", "eq", "in", "limit"]) q[m] = () => q;
  q.upsert = () => { ecritures.push(`upsert:${table}`); return q; };
  q.insert = () => { ecritures.push(`insert:${table}`); return q; };
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from, auth: { getUser: async () => ({ data: { user: utilisateur } }) } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/github-secrets", () => ({ secretsConfigures: () => true, poserSecretCookie }));

const { renouvelerCookie } = await import("@/app/(app)/admin/cookies-actions");
const COOKIE = "TTFLhash=abc123DEF456ghi789; TTFLmail=jean%40mail.fr";

beforeEach(() => {
  utilisateur = null;
  poserSecretCookie.mockClear();
  ecritures.length = 0;
});

describe("renouvelerCookie : réservé au propriétaire", () => {
  it("refuse sans session : aucun secret écrit, aucune écriture en base", async () => {
    const r = await renouvelerCookie("03", COOKIE);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/Session expirée/) });
    expect(poserSecretCookie).not.toHaveBeenCalled();
    expect(ecritures).toEqual([]);
  });

  it("refuse un utilisateur anonyme (même connecté)", async () => {
    utilisateur = { id: "11111111-2222-3333-4444-555555555555", is_anonymous: true };
    const r = await renouvelerCookie("03", COOKIE);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/réservée au propriétaire/) });
    expect(poserSecretCookie).not.toHaveBeenCalled();
    expect(ecritures).toEqual([]);
  });

  it("refuse un autre utilisateur connecté (autre application du même projet)", async () => {
    utilisateur = { id: "99999999-2222-3333-4444-555555555555", is_anonymous: false };
    const r = await renouvelerCookie("13", COOKIE);
    expect(r).toMatchObject({ ok: false });
    expect(poserSecretCookie).not.toHaveBeenCalled();
  });

  it("refuse un identifiant anonyme qui prétendrait être le propriétaire", async () => {
    utilisateur = { id: PROPRIETAIRE, is_anonymous: true };
    expect(await renouvelerCookie("03", COOKIE)).toMatchObject({ ok: false });
    expect(poserSecretCookie).not.toHaveBeenCalled();
  });

  it("ne dévoile jamais l'identifiant attendu dans le message de refus", async () => {
    utilisateur = { id: "99999999-2222-3333-4444-555555555555" };
    const r = await renouvelerCookie("03", COOKIE);
    expect(JSON.stringify(r)).not.toContain(PROPRIETAIRE);
  });

  it("accepte le propriétaire : le secret est posé et la date notée", async () => {
    utilisateur = { id: PROPRIETAIRE, is_anonymous: false };
    const r = await renouvelerCookie("03", COOKIE);
    expect(r).toMatchObject({ ok: true });
    expect(poserSecretCookie).toHaveBeenCalledWith("03", COOKIE);
    expect(ecritures).toContain("upsert:ttfl_cookie_renouvellements");
  });

  it("garde les refus d'avant : compte inconnu et cookie invalide ne touchent à rien", async () => {
    utilisateur = { id: PROPRIETAIRE };
    expect(await renouvelerCookie("99", COOKIE)).toMatchObject({ ok: false });
    expect(await renouvelerCookie("03", "n'importe quoi")).toMatchObject({ ok: false });
    expect(poserSecretCookie).not.toHaveBeenCalled();
  });
});

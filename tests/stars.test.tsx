import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";
import { soireesRestantes, starsParCompte } from "@/lib/stars";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
const { default: StarsPage } = await import("@/app/(app)/stars/page");

const AUJ = "2026-10-23";

describe("soireesRestantes", () => {
  it("compte du jour à la fin de la saison, inclus", () => {
    expect(soireesRestantes("2027-04-10")).toBe(2);
    expect(soireesRestantes("2027-04-11")).toBe(1);
    expect(soireesRestantes("2027-04-12")).toBe(0);
  });
  it("avant l'ouverture, compte depuis l'ouverture", () => {
    expect(soireesRestantes("2026-10-01")).toBe(soireesRestantes("2026-10-20"));
  });
});

describe("starsParCompte", () => {
  const picks = [
    { compte: "03", player: "Joueur A", pick_date: "2026-10-20" },
    { compte: "03", player: "Joueur B", pick_date: "2026-09-24" }, // 29 jours avant : libre le 25/10
    { compte: "03", player: "Joueur C", pick_date: "2026-09-22" }, // 31 jours avant : libre aujourd'hui
    { compte: "04", player: "Joueur A", pick_date: "2026-10-25" }, // pick à venir
  ];
  const r = starsParCompte(picks, ["03", "04", "05"], AUJ);

  it("bloque un joueur 30 jours et le libère le 31e jour", () => {
    const c3 = r[0];
    expect(c3.bloquees.map((b) => b.player)).toEqual(["Joueur B", "Joueur A"]);
    expect(c3.bloquees[0]).toMatchObject({ libre_le: "2026-10-25", jours_restants: 2, a_venir: false });
    expect(c3.bloquees[1]).toMatchObject({ pris_le: "2026-10-20", libre_le: "2026-11-20", jours_restants: 28 });
    expect(c3.prochaine_libre?.player).toBe("Joueur B");
  });
  it("un pick à venir bloque aussi", () => {
    expect(r[1].bloquees[0]).toMatchObject({ a_venir: true, libre_le: "2026-11-25" });
    expect(r[1].deja_posees).toBe(1);
  });
  it("compte sans pick : rien de bloqué", () => {
    expect(r[2].bloquees).toEqual([]);
    expect(r[2].prochaine_libre).toBeNull();
  });
  it("un même joueur compte une fois, avec son dernier pick", () => {
    const x = starsParCompte(
      [{ compte: "03", player: "Joueur A", pick_date: "2026-10-01" }, { compte: "03", player: "joueur a", pick_date: "2026-10-22" }],
      ["03"],
      AUJ,
    )[0];
    expect(x.bloquees).toHaveLength(1);
    expect(x.bloquees[0].pris_le).toBe("2026-10-22");
  });
});

describe("page Stars", () => {
  beforeEach(() => {
    createClient.mockReset();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-23T16:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const lignes = [
    { compte: "03", player: "Joueur Visible", pick_date: "2026-10-20" },
    { compte: "02", player: "Joueur Secret", pick_date: "2026-10-23" },
    { compte: "02", player: "Joueur Ancien", pick_date: "2026-10-15" },
  ];

  it("montre les stars bloquées de chaque compte", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_picks: lignes }));
    render(await StarsPage());
    expect(screen.getByRole("heading", { name: "Stars" })).toBeInTheDocument();
    expect(screen.getByText("Joueur Visible")).toBeInTheDocument();
    expect(screen.getAllByText(/Compte \d\d/)).toHaveLength(13);
  });

  it("ne montre pas le pick du compte secret tant que sa soirée est secrète", async () => {
    createClient.mockResolvedValue(
      fakeSupabase({
        ttfl_picks: lignes,
        ttfl_secret_reglage: [{ id: 1, actif: true, compte: "02", profil: "prudent" }],
        ttfl_secret_pick: [{ soiree: "2026-10-23", cloture: "2026-10-23T23:00:00+00:00", revele_le: null, motif: null }],
      }),
    );
    render(await StarsPage());
    expect(screen.queryByText("Joueur Secret")).not.toBeInTheDocument();
    expect(screen.getByText("Joueur Visible")).toBeInTheDocument();
    expect(screen.getByText("Joueur Ancien")).toBeInTheDocument(); // soirée passée : déjà visible
    expect(screen.getByText(/ne sont pas montrés ici/)).toBeInTheDocument();
  });
});

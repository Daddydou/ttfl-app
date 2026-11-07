// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";
import { aujourdhuiNY } from "@/lib/planning";
import { absencesParSoiree, bilanMoteur, correlation } from "@/lib/stats-moteur";
import { chargerProjectionsDesSoirees } from "@/lib/stats-donnees";
import type { ScorePick } from "@/lib/stats-equipe";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/stats/strategie", useSearchParams: () => new URLSearchParams() }));
const { default: Strategie } = await import("@/app/(app)/stats/strategie/page");

const pick = (pick_date: string, player: string, score: number | null, compte = "01"): ScorePick => ({ compte, pick_date, player, score });

describe("bilanMoteur", () => {
  const picks = [pick("2026-11-01", "Nikola Jokic", 50), pick("2026-11-01", "Luka Doncic", 30), pick("2026-11-02", "Inconnu", 10), pick("2026-11-02", "Pas noté", null)];
  const projections = [
    { date: "2026-11-01", player: "Nikola Jokić", projection: 45 }, // accent : le rapprochement ignore les accents
    { date: "2026-11-01", player: "Luka Doncic", projection: 40 },
    { date: "2026-11-02", player: "Autre", projection: 35 },
  ];

  it("compare les picks retrouvés dans le calcul de la soirée, et dit la couverture", () => {
    const b = bilanMoteur(picks, projections);
    expect(b.nPicks).toBe(3);
    expect(b.nCompares).toBe(2);
    expect(b.couverture).toBeCloseTo(66.67, 1);
    expect(b.projectionMoyenne).toBe(42.5);
    expect(b.reelMoyen).toBe(40);
    expect(b.biais).toBe(-2.5);
    expect(b.erreurMoyenne).toBe(7.5);
    expect(b.plusGrosEcarts[0].joueur).toBe("Luka Doncic");
  });

  it("corrélation : null sous 5 points, calculée au-delà", () => {
    expect(correlation([1, 2], [1, 2])).toBeNull();
    expect(correlation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBe(1);
    expect(correlation([1, 1, 1, 1, 1], [1, 2, 3, 4, 5])).toBeNull();
  });

  it("sans calcul du moteur, rien n'est comparé et rien ne plante", () => {
    const b = bilanMoteur(picks, []);
    expect(b.nCompares).toBe(0);
    expect(b.biais).toBeNull();
  });
});

describe("absencesParSoiree", () => {
  it("garde le DERNIER statut de chaque joueur par soirée", () => {
    const a = absencesParSoiree([
      { game_date: "2026-11-05", joueur_norm: "a", statut: "Doubtful", vu_le: "2026-11-05T10:00:00Z" },
      { game_date: "2026-11-05", joueur_norm: "a", statut: "Out", vu_le: "2026-11-05T18:00:00Z" },
      { game_date: "2026-11-05", joueur_norm: "b", statut: "Questionable", vu_le: "2026-11-05T12:00:00Z" },
      { game_date: "2026-11-04", joueur_norm: "c", statut: "OUT", vu_le: "2026-11-04T12:00:00Z" },
    ]);
    expect(a).toEqual([
      { date: "2026-11-04", out: 1, doubtful: 0, autres: 0 },
      { date: "2026-11-05", out: 1, doubtful: 0, autres: 1 },
    ]);
  });
});

describe("chargerProjectionsDesSoirees et page Stratégie", () => {
  const aujourdhui = aujourdhuiNY();
  const tables = {
    ttfl_runs: [
      { id: 1, mode: "regular", game_date: "2026-11-01", computed_at: "2026-11-01T10:00:00Z" },
      { id: 2, mode: "regular", game_date: "2026-11-01", computed_at: "2026-11-01T20:00:00Z" },
    ],
    ttfl_projections: [{ run_id: 2, player: "Nikola Jokic", projection: 45, rank: 1 }],
    ttfl_picks: [
      { compte: "01", pick_date: "2026-11-01", player: "Nikola Jokic", score: 50, mode: "regular" },
      { compte: "02", pick_date: aujourdhui, player: "JOUEUR_SECRET_02", score: 99, mode: "regular" },
    ],
    ttfl_secret_reglage: [{ id: 1, actif: true, compte: "02", profil: "prudent" }],
    ttfl_secret_pick: [],
  };

  it("rattache la projection à la date du calcul", async () => {
    const sb = fakeSupabase(tables);
    const l = await chargerProjectionsDesSoirees(sb as never, "regular", ["2026-11-01"]);
    expect(l).toEqual([{ date: "2026-11-01", player: "Nikola Jokic", projection: 45 }]);
  });

  it("la page affiche le bilan du moteur et ne laisse fuiter ni le joueur ni les points du compte 02 d'une soirée ouverte", async () => {
    createClient.mockResolvedValue(fakeSupabase(tables));
    const { container } = render(await Strategie({ searchParams: Promise.resolve({ mode: "regular" }) }));
    expect(screen.getByText("Le moteur face à la réalité")).toBeInTheDocument();
    expect(container.textContent).not.toContain("JOUEUR_SECRET_02");
    expect(container.textContent).not.toContain("99");
  });
});

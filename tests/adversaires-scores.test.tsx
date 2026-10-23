import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";
import { scoresParAdversaire } from "@/lib/adversaires";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
const { default: AdversairesPage } = await import("@/app/(app)/adversaires/page");

const sc = (users_id: number, soiree: string, score_du_jour: number | null) => ({ users_id, soiree, score_du_jour });

describe("scoresParAdversaire", () => {
  it("calcule moyenne, meilleur score et score par soirée", () => {
    const m = scoresParAdversaire([sc(1, "2026-10-20", 30), sc(1, "2026-10-21", 50), sc(2, "2026-10-21", 10)]);
    expect(m.get(1)).toMatchObject({ n: 2, moyenne: 40, meilleur: 50 });
    expect(m.get(1)!.parSoiree.get("2026-10-21")).toBe(50);
    expect(m.get(2)).toMatchObject({ n: 1, moyenne: 10 });
  });
  it("ignore les scores inconnus et respecte la fenêtre", () => {
    const m = scoresParAdversaire([sc(1, "2026-10-01", 99), sc(1, "2026-10-21", null), sc(1, "2026-10-22", 20)], "2026-10-15");
    expect(m.get(1)).toMatchObject({ n: 1, moyenne: 20, meilleur: 20 });
  });
  it("une seule valeur par soirée", () => {
    const m = scoresParAdversaire([sc(1, "2026-10-21", 40), sc(1, "2026-10-21", 40)]);
    expect(m.get(1)!.n).toBe(1);
  });
  it("sans donnée : rien", () => {
    expect(scoresParAdversaire([]).size).toBe(0);
  });
});

describe("page Adversaires avec scores", () => {
  const suivis = [{ users_id: 1, pseudo: "Alpha", equipe: "Eq", rang: 10, points: 1200, moyenne: null, best_picks: 0, x2: 0, suivi: true, maj_le: "2026-10-21T08:00:00Z" }];
  const picks = [{ users_id: 1, pick_date: "2026-10-21", joueur: "Luka Doncic" }];

  it("montre la moyenne récente et le score de la soirée", async () => {
    createClient.mockResolvedValue(
      fakeSupabase({ ttfl_suivis: suivis, ttfl_suivis_picks: picks, ttfl_suivis_scores: [sc(1, "2026-10-21", 44), sc(1, "2026-10-20", 36)] }),
    );
    render(await AdversairesPage());
    expect(screen.getByText(/moy\. 40\.0 sur 2 soirées · meilleur 44/)).toBeInTheDocument();
    expect(screen.getByText("44")).toBeInTheDocument();
  });

  it("reste utilisable sans la vue des scores", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_suivis: suivis, ttfl_suivis_picks: picks }));
    render(await AdversairesPage());
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
    expect(screen.queryByText(/moy\./)).not.toBeInTheDocument();
  });
});

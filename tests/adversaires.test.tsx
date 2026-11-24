import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";
import { adversairesParRang, fmtRang, nomJoueurSuivi } from "@/lib/adversaires";
import { aujourdhuiNY } from "@/lib/planning";
import type { TtflSuivi, TtflSuiviPick } from "@/lib/types";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

const { default: AdversairesPage } = await import("@/app/(app)/adversaires/page");

function suivi(id: number, pseudo: string, rang: number | null, extra: Partial<TtflSuivi> = {}): TtflSuivi {
  return { users_id: id, pseudo, equipe: "Mon Equipe", rang, points: 1200, moyenne: null, best_picks: 0, x2: 0, suivi: true, maj_le: "2026-10-21T08:00:00Z", ...extra };
}
const pick = (id: number, date: string, joueur: string): TtflSuiviPick => ({ users_id: id, pick_date: date, joueur });

const SUIVIS = [suivi(1, "Alpha", 2833), suivi(2, "Beta", 1824), suivi(3, "Gamma", null, { equipe: null })];

describe("lib/adversaires", () => {
  it("classe les adversaires par rang (inconnu en dernier)", () => {
    expect(adversairesParRang(SUIVIS).map((s) => s.pseudo)).toEqual(["Beta", "Alpha", "Gamma"]);
  });

  it("nomJoueurSuivi : retire le score collé au nom par le site", () => {
    expect(nomJoueurSuivi("Anthony Davis · 37 pts")).toBe("Anthony Davis");
    expect(nomJoueurSuivi("Luka Dončić · 32×2=64 pts")).toBe("Luka Dončić");
    expect(nomJoueurSuivi("Nikola Jokic")).toBe("Nikola Jokic");
  });

  it("fmtRang", () => {
    expect(fmtRang(null)).toBe("—");
    expect(fmtRang(2833)).toMatch(/^#2\s?833$/);
  });
});

// Une soirée du jour avec trois joueurs ; Alpha a pické Luka Doncic hier (bloqué), Beta non.
function nuitDuJour() {
  const jour = aujourdhuiNY();
  const proj = (player: string, projection: number, rank: number) => ({
    id: rank, run_id: 1, rank, player, team: "LAL", opponent: "BOS", position: null, projection, forme: null, ceiling: null,
    matchup_factor: null, status: null, is_pick: false, is_urgent: false, series_state: null, expected_nights_left: null,
    explanation: null, historique: null,
  });
  return {
    jour,
    tables: {
      ttfl_nuits: [{ mode: "regular", game_date: jour, n_runs: 1, n_soir: 0, max_candidats: 3, dernier_calcul: "2026-11-23T08:00:00Z" }],
      ttfl_runs: [{ id: 1, mode: "regular", game_date: jour, computed_at: "2026-11-23T08:00:00Z", note: "AVANCE", injury_report_fresh: false, n_candidates: 3 }],
      ttfl_projections: [proj("Nikola Jokic", 58, 1), proj("Luka Doncic", 55, 2), proj("Joel Embiid", 50, 3)],
    },
  };
}

describe("page Adversaires", () => {
  it("affiche chaque adversaire avec son rang et ses points, sans les derniers picks", async () => {
    createClient.mockResolvedValue(
      fakeSupabase({ ttfl_suivis: SUIVIS, ttfl_suivis_picks: [pick(1, "2026-10-21", "Nikola Jokic · 50 pts")] }),
    );
    render(await AdversairesPage());
    const lignes = screen.getAllByRole("listitem").filter((li) => li.className.includes("list-row"));
    expect(lignes).toHaveLength(3);
    expect(lignes[0]).toHaveTextContent("Beta");
    expect(lignes[1]).toHaveTextContent("Alpha");
    expect(lignes[2]).toHaveTextContent("Sans équipe");
    expect(screen.queryByRole("heading", { name: /Picks du/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Dernier pick/)).not.toBeInTheDocument();
    expect(screen.queryByText(/· 50 pts/)).not.toBeInTheDocument();
  });

  it("liste ce que chaque adversaire peut encore prendre parmi le top 30, sans ses joueurs bloqués", async () => {
    const { jour, tables } = nuitDuJour();
    const hier = new Date(`${jour}T00:00:00Z`);
    hier.setUTCDate(hier.getUTCDate() - 1);
    createClient.mockResolvedValue(
      fakeSupabase({
        ttfl_suivis: [suivi(1, "Alpha", 10), suivi(2, "Beta", 20)],
        ttfl_suivis_picks: [pick(1, hier.toISOString().slice(0, 10), "Luka Doncic · 32 pts")],
        ...tables,
      }),
    );
    render(await AdversairesPage());
    const [alpha, beta] = screen.getAllByRole("listitem").filter((li) => li.className.includes("list-row"));
    expect(alpha).toHaveTextContent("Peut prendre : 2 joueurs du top 30 · 2 dès ce soir");
    expect(within(alpha).queryByText("Luka Doncic")).not.toBeInTheDocument();
    expect(within(alpha).getByText("Nikola Jokic")).toBeInTheDocument();
    expect(beta).toHaveTextContent("Peut prendre : 3 joueurs du top 30 · 3 dès ce soir");
    expect(within(beta).getByText("Luka Doncic")).toBeInTheDocument();
  });

  it("sans projection : la page reste utilisable", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_suivis: SUIVIS, ttfl_suivis_picks: [] }));
    render(await AdversairesPage());
    expect(screen.getByText(/Aucune projection pour les prochains jours/)).toBeInTheDocument();
    expect(screen.queryByText(/Peut prendre/)).not.toBeInTheDocument();
  });

  it("sans donnée : explique comment alimenter la liste, sans erreur", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_suivis: [], ttfl_suivis_picks: [] }));
    render(await AdversairesPage());
    expect(screen.getByText(/Aucun adversaire relevé/)).toBeInTheDocument();
  });

  it("tables absentes : message clair qui renvoie au fichier de migration", async () => {
    const q = (erreur: string) => {
      const r: Record<string, unknown> = { then: (res: (v: unknown) => unknown) => res({ data: null, error: { message: erreur } }) };
      for (const m of ["select", "eq", "gte", "order", "limit", "returns"]) r[m] = () => r;
      return r;
    };
    createClient.mockResolvedValue({ from: () => q('relation "public.ttfl_suivis" does not exist') });
    render(await AdversairesPage());
    expect(screen.getByText(/migration_suivis\.sql/)).toBeInTheDocument();
    expect(within(document.body).queryByText(/Aucun adversaire relevé/)).not.toBeInTheDocument();
  });
});

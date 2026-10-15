import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";
import { adversairesAvecPicks, derniersChoix, fmtRang } from "@/lib/adversaires";
import type { TtflSuivi, TtflSuiviPick } from "@/lib/types";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

const { default: AdversairesPage } = await import("@/app/(app)/adversaires/page");

function suivi(id: number, pseudo: string, rang: number | null, extra: Partial<TtflSuivi> = {}): TtflSuivi {
  return { users_id: id, pseudo, equipe: "Mon Equipe", rang, points: 1200, moyenne: null, best_picks: 0, x2: 0, suivi: true, maj_le: "2026-10-21T08:00:00Z", ...extra };
}
const pick = (id: number, date: string, joueur: string): TtflSuiviPick => ({ users_id: id, pick_date: date, joueur });

const SUIVIS = [suivi(1, "Alpha", 2833), suivi(2, "Beta", 1824), suivi(3, "Gamma", null, { equipe: null })];
const PICKS = [
  pick(1, "2026-10-21", "Shai Gilgeous-Alexander"),
  pick(2, "2026-10-21", "Shai Gilgeous-Alexander"),
  pick(3, "2026-10-21", "Nikola Jokic"),
  pick(1, "2026-10-20", "Luka Doncic"),
];

describe("lib/adversaires", () => {
  it("classe les adversaires par rang (inconnu en dernier) et trie leurs picks du plus récent au plus ancien", () => {
    const l = adversairesAvecPicks(SUIVIS, PICKS);
    expect(l.map((a) => a.suivi.pseudo)).toEqual(["Beta", "Alpha", "Gamma"]);
    expect(l[1].picks.map((p) => p.pick_date)).toEqual(["2026-10-21", "2026-10-20"]);
  });

  it("derniersChoix : regroupe par joueur, le plus choisi d'abord, à la dernière date relevée", () => {
    const d = derniersChoix(SUIVIS, PICKS)!;
    expect(d.date).toBe("2026-10-21");
    expect(d.choix[0]).toEqual({ joueur: "Shai Gilgeous-Alexander", pseudos: ["Alpha", "Beta"] });
    expect(d.choix[1].joueur).toBe("Nikola Jokic");
    expect(derniersChoix(SUIVIS, [])).toBeNull();
  });

  it("fmtRang", () => {
    expect(fmtRang(null)).toBe("—");
    expect(fmtRang(2833)).toMatch(/^#2\s?833$/);
  });
});

describe("page Adversaires", () => {
  it("affiche chaque adversaire avec son rang, ses points et l'historique de ses picks", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_suivis: SUIVIS, ttfl_suivis_picks: PICKS }));
    render(await AdversairesPage());
    const lignes = screen.getAllByRole("listitem").filter((li) => li.className.includes("list-row"));
    expect(lignes).toHaveLength(3);
    expect(lignes[0]).toHaveTextContent("Beta");
    expect(lignes[1]).toHaveTextContent("Alpha");
    expect(lignes[1]).toHaveTextContent("Dernier pick : Shai Gilgeous-Alexander · 2 gardés");
    expect(lignes[2]).toHaveTextContent("Sans équipe");
    expect(screen.getByRole("heading", { name: /Picks du/ })).toBeInTheDocument();
  });

  it("sans donnée : explique comment alimenter la liste, sans erreur", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_suivis: [], ttfl_suivis_picks: [] }));
    render(await AdversairesPage());
    expect(screen.getByText(/Aucun adversaire relevé/)).toBeInTheDocument();
  });

  it("tables absentes : message clair qui renvoie au fichier de migration", async () => {
    const q = (erreur: string) => {
      const r: Record<string, unknown> = { then: (res: (v: unknown) => unknown) => res({ data: null, error: { message: erreur } }) };
      for (const m of ["select", "eq", "order", "limit", "returns"]) r[m] = () => r;
      return r;
    };
    createClient.mockResolvedValue({ from: () => q('relation "public.ttfl_suivis" does not exist') });
    render(await AdversairesPage());
    expect(screen.getByText(/migration_suivis\.sql/)).toBeInTheDocument();
    expect(within(document.body).queryByText(/Aucun adversaire relevé/)).not.toBeInTheDocument();
  });
});

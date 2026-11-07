// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";
import { aujourdhuiNY } from "@/lib/planning";
import { ETAT_ETEINT, type EtatSecret } from "@/lib/secret";
import { chargerSuiviFormules, chargerX2 } from "@/lib/stats-donnees";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/stats", useSearchParams: () => new URLSearchParams() }));

const { default: Apercu } = await import("@/app/(app)/stats/page");
const { default: Equipe } = await import("@/app/(app)/stats/equipe/page");
const { default: Strategie } = await import("@/app/(app)/stats/strategie/page");
const { default: Vainqueurs } = await import("@/app/(app)/stats/vainqueurs/page");
const { default: Systeme } = await import("@/app/(app)/stats/systeme/page");
const { default: Adversaires } = await import("@/app/(app)/stats/adversaires/page");
const { default: JoueursNba } = await import("@/app/(app)/stats/joueurs-nba/page");
const { StatsNav } = await import("@/components/stats/StatsNav");

const aujourdhui = aujourdhuiNY();
const sp = (mode?: string) => ({ searchParams: Promise.resolve({ mode }) });
const RUNS = [{ id: 1, mode: "regular", game_date: aujourdhui, computed_at: "2026-11-07T10:00:00Z" }];

// Le secret du compte 02 est ALLUMÉ, sa soirée (aujourd'hui) n'a ni clôture ni révélation : elle est donc secrète.
const SECRET_ALLUME = { ttfl_secret_reglage: [{ id: 1, actif: true, compte: "02", profil: "prudent" }], ttfl_secret_pick: [] };

const PICKS = [
  { compte: "01", pick_date: "2026-11-01", player: "Nikola Jokic", score: 40, mode: "regular" },
  { compte: "01", pick_date: "2026-11-02", player: "Luka Doncic", score: 20, mode: "regular" },
  { compte: "02", pick_date: aujourdhui, player: "JOUEUR_SECRET_02", score: 99, mode: "regular" },
];

describe("sous-pages Stats", () => {
  it("Équipe : le pick du compte 02 d'une soirée ouverte n'apparaît NULLE PART (ni nom, ni points)", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_picks: PICKS, ttfl_runs: RUNS, ...SECRET_ALLUME }));
    const { container } = render(await Equipe(sp("regular")));
    expect(container.textContent).not.toContain("JOUEUR_SECRET_02");
    expect(container.textContent).not.toContain("99");
    expect(container.textContent).toContain("Nikola Jokic");
    expect(screen.getAllByTestId("tuile")[0]).toHaveTextContent("60"); // 40 + 20, sans les 99 du compte 02
  });

  it("Équipe : une fois le secret éteint, le pick du compte 02 compte normalement", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_picks: PICKS, ttfl_runs: RUNS }));
    render(await Equipe(sp("regular")));
    expect(screen.getAllByTestId("tuile")[0]).toHaveTextContent("159");
  });

  it("Équipe : lecture du secret impossible = tout est caché (le 02 est exclu)", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_picks: PICKS, ttfl_runs: RUNS, ttfl_secret_reglage: [] }));
    const { container } = render(await Equipe(sp("regular")));
    expect(container.textContent).not.toContain("JOUEUR_SECRET_02");
  });

  it("Équipe : sans score, affiche un message au lieu de planter", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_picks: [], ttfl_runs: RUNS }));
    render(await Equipe(sp("regular")));
    expect(screen.getByText(/Pas encore de score/)).toBeInTheDocument();
  });

  it("Aperçu : tuiles et menu vers les 7 sous-pages", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_picks: PICKS, ttfl_runs: RUNS, ...SECRET_ALLUME }));
    render(await Apercu(sp("regular")));
    for (const nom of ["Équipe", "Mes picks", "Stratégie", "Adversaires", "Joueurs NBA", "Vainqueurs", "Système"]) {
      expect(screen.getByRole("link", { name: new RegExp(nom) })).toBeInTheDocument();
    }
  });

  it("Stratégie : sans donnée, explique que c'est vide", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_runs: RUNS, ...SECRET_ALLUME }));
    render(await Strategie(sp("regular")));
    expect(screen.getByText(/Pas encore assez de soirées notées/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun ×2 enregistré/)).toBeInTheDocument();
  });

  it("Vainqueurs, Système, Adversaires, Joueurs NBA : états vides sans erreur", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_runs: RUNS, ...SECRET_ALLUME }));
    render(await Vainqueurs());
    expect(screen.getByText(/Pas encore de match terminé/)).toBeInTheDocument();
    render(await Systeme());
    expect(screen.getByText(/Aucun passage du moteur/)).toBeInTheDocument();
    render(await Adversaires());
    expect(screen.getByText(/Aucun adversaire suivi/)).toBeInTheDocument();
    render(await JoueursNba(sp("regular")));
    expect(screen.getByText(/Pas encore de calcul du moteur/)).toBeInTheDocument();
  });

  it("Menu : une pastille par sous-page, l'aperçu est la page courante", () => {
    render(<StatsNav />);
    expect(screen.getAllByRole("link")).toHaveLength(8);
    expect(screen.getByRole("link", { name: "Aperçu" })).toHaveAttribute("aria-current", "page");
  });
});

describe("chargeurs et pick secret", () => {
  const etatSecret: EtatSecret = { actif: true, compte: "02", profil: "prudent", lignes: {}, lisible: true };
  const ctx = (etat: EtatSecret) => ({ etat, aujourdhui, maintenantMs: Date.now() });

  it("suivi des formules : la ligne « prudent » d'une soirée secrète est retirée, pas les autres", async () => {
    const sb = fakeSupabase({
      ttfl_plan30_suivi: [
        { profil: "prudent", pick_date: aujourdhui, joueur: "JOUEUR_SECRET_02", projection: 30, score_reel: null },
        { profil: "equilibre", pick_date: aujourdhui, joueur: "Autre", projection: 31, score_reel: null },
        { profil: "prudent", pick_date: "2026-11-01", joueur: "Ancien", projection: 30, score_reel: 22 },
      ],
    });
    const l = await chargerSuiviFormules(sb as never, ctx(etatSecret));
    expect(l.map((x) => x.joueur).sort()).toEqual(["Ancien", "Autre"]);
    const toutes = await chargerSuiviFormules(sb as never, ctx(ETAT_ETEINT));
    expect(toutes).toHaveLength(3);
  });

  it("x2 : les lignes du compte 02 d'une soirée secrète sont retirées", async () => {
    const base = { mois: "2026-11", source: "app", statut: "voulu", date_site: null, message: null, rang: null };
    const sb = fakeSupabase({
      ttfl_x2: [
        { ...base, compte: "02", pick_date: aujourdhui, player: "JOUEUR_SECRET_02" },
        { ...base, compte: "03", pick_date: aujourdhui, player: "Public" },
      ],
    });
    const l = await chargerX2(sb as never, ctx(etatSecret));
    expect(l.map((x) => x.player)).toEqual(["Public"]);
  });
});

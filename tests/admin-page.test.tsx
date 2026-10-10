import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/app/(app)/admin/actions", () => ({
  lancerCommande: vi.fn(), annulerCommande: vi.fn(), importerPicks: vi.fn(), copierPicks: vi.fn(), supprimerPicks: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { default: AdminPage } = await import("@/app/(app)/admin/page");

beforeEach(() => {
  createClient.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T14:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const pouls = (iso: string) => [{ valeur: { dernier_passage: iso }, maj_le: iso }];
async function rendre(tables: Record<string, unknown[]>) {
  createClient.mockResolvedValue(fakeSupabase(tables));
  render(await AdminPage());
}

describe("Page Admin", () => {
  it("dit que le PC est en ligne quand l'exécuteur est passé il y a moins de 3 minutes", async () => {
    await rendre({ ttfl_commandes: [], ttfl_robot_etat: pouls("2026-10-10T13:59:00Z") });
    expect(screen.getByText("PC en ligne")).toBeInTheDocument();
    expect(screen.getByText(/Les actions démarrent dans la minute/)).toBeInTheDocument();
  });

  it("prévient quand le PC est hors ligne : les actions attendront son retour", async () => {
    await rendre({ ttfl_commandes: [], ttfl_robot_etat: pouls("2026-10-10T13:20:00Z") });
    expect(screen.getByText("PC hors ligne")).toBeInTheDocument();
    expect(screen.getByText(/attendront que le PC soit allumé/)).toBeInTheDocument();
  });

  it("signale qu'aucun passage n'a jamais été reçu", async () => {
    await rendre({ ttfl_commandes: [], ttfl_robot_etat: [] });
    expect(screen.getByText("Aucun passage reçu")).toBeInTheDocument();
  });

  it("affiche l'historique et désactive les actions déjà en attente ou en cours", async () => {
    await rendre({
      ttfl_robot_etat: pouls("2026-10-10T13:59:30Z"),
      ttfl_commandes: [
        { id: 2, type: "benchmarks", params: {}, statut: "en_cours", demande_le: "2026-10-10T13:58:00Z", debut_le: "2026-10-10T13:58:10Z", fin_le: null, resume: null, sortie: null },
        { id: 1, type: "calendrier", params: {}, statut: "ok", demande_le: "2026-10-10T13:00:00Z", debut_le: "2026-10-10T13:00:05Z", fin_le: "2026-10-10T13:00:50Z", resume: "Terminée — 19 soirée(s)", sortie: "x" },
      ],
    });
    expect(screen.getByText("En cours")).toBeInTheDocument();
    expect(screen.getByText("Terminée")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lancer : Mettre à jour les repères" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lancer : Mettre à jour le calendrier TTFL" })).toBeEnabled(); // terminée : relançable
  });

  it("propose les trois blocs : actions du PC, historique et picks en masse", async () => {
    await rendre({ ttfl_commandes: [], ttfl_robot_etat: [] });
    expect(screen.getByRole("heading", { name: "Actions sur le PC" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Historique des demandes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Picks en masse" })).toBeInTheDocument();
  });
});

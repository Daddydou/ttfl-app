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
const { default: ActionsPage } = await import("@/app/(app)/admin/actions/page");
const { default: MassePage } = await import("@/app/(app)/admin/masse/page");
const { default: CloudPage } = await import("@/app/(app)/admin/cloud/page");

beforeEach(() => {
  createClient.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T14:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const pouls = (iso: string) => [{ cle: "commandes", valeur: { dernier_passage: iso }, maj_le: iso }];
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

  it("prévient quand le PC est hors ligne : les actions « Cloud » partent quand même, les autres attendront", async () => {
    await rendre({ ttfl_commandes: [], ttfl_robot_etat: pouls("2026-10-10T13:20:00Z") });
    expect(screen.getByText("PC hors ligne")).toBeInTheDocument();
    expect(screen.getByText(/s'exécutent quand même .* les autres attendront le PC/)).toBeInTheDocument();
  });

  it("affiche la santé des tâches : PC muet depuis 40 min = en retard", async () => {
    await rendre({ ttfl_commandes: [], ttfl_robot_etat: pouls("2026-10-10T13:20:00Z") });
    expect(screen.getByRole("heading", { name: "Santé des tâches" })).toBeInTheDocument();
    expect(screen.getByText("Exécuteur du PC")).toBeInTheDocument();
    expect(screen.getAllByText(/En retard/).length).toBeGreaterThanOrEqual(1);
  });

  it("signale qu'aucun passage n'a jamais été reçu", async () => {
    await rendre({ ttfl_commandes: [], ttfl_robot_etat: [] });
    expect(screen.getByText("Aucun passage reçu")).toBeInTheDocument();
  });

  it("liste les rubriques en sous-pages, façon Réglages", async () => {
    await rendre({ ttfl_commandes: [], ttfl_robot_etat: [] });
    for (const [nom, href] of [
      ["Actions", "/admin/actions"],
      ["Journal d'envoi", "/admin/envois"],
      ["Pick secret", "/admin/secret"],
      ["Picks en masse", "/admin/masse"],
      ["Cookies TTFL", "/admin/cookies"],
    ]) {
      expect(screen.getByRole("link", { name: new RegExp(`^${nom}`) })).toHaveAttribute("href", href);
    }
  });
});

describe("Admin > Actions", () => {
  async function rendreActions(tables: Record<string, unknown[]>) {
    createClient.mockResolvedValue(fakeSupabase(tables));
    render(await ActionsPage());
  }

  it("affiche l'historique et désactive les actions déjà en attente ou en cours", async () => {
    await rendreActions({
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

  it("propose les actions (dont au moins 3 « Cloud ») et l'historique", async () => {
    await rendreActions({ ttfl_commandes: [] });
    expect(screen.getByRole("heading", { name: "Lancer une action" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Historique des demandes" })).toBeInTheDocument();
    expect(screen.getAllByText("Cloud").length).toBeGreaterThanOrEqual(3);
  });
});

describe("Admin > Picks en masse", () => {
  it("affiche le bloc", async () => {
    render(MassePage());
    expect(screen.getByRole("heading", { name: "Picks en masse", level: 2 })).toBeInTheDocument();
  });
});

describe("Admin — moteur cloud", () => {
  it("affiche l'interrupteur à 3 positions avec le mode courant", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_robot_etat: [], ttfl_cloud_reglage: [{ id: 1, mode: "simulation" }] }));
    render(await CloudPage());
    expect(screen.getByRole("heading", { name: "Moteur dans le cloud", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Essai à blanc" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Cloud en charge" })).toHaveAttribute("aria-checked", "false");
  });

  it("cloud en charge : la pastille dit que le PC est au repos", async () => {
    await rendre({ ttfl_commandes: [], ttfl_robot_etat: pouls("2026-10-10T08:00:00Z"), ttfl_cloud_reglage: [{ id: 1, mode: "reel" }] });
    expect(screen.getByText("Cloud en charge — le PC est au repos")).toBeInTheDocument();
  });
});

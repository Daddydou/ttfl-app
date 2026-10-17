import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { JourPlan30, TtflPlan30 } from "@/lib/plan30";

const refresh = vi.fn();
const verrouiller = vi.fn();
const deverrouiller = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/actions", () => ({
  pickPlayerComptes: vi.fn(),
  verrouillerPickManuel: (...a: unknown[]) => verrouiller(...a),
  deverrouillerPickManuel: (...a: unknown[]) => deverrouiller(...a),
}));
vi.mock("@/app/(app)/admin/actions", () => ({ lancerCommande: vi.fn() }));

const { PlanTrenteJours } = await import("@/components/PlanTrenteJours");

const AUJOURDHUI = "2026-10-20";
const MAINTENANT = Date.parse("2026-10-20T15:00:00Z");

function jour(i: number, extra: Partial<JourPlan30> = {}): JourPlan30 {
  const date = new Date(Date.UTC(2026, 9, 20 + i)).toISOString().slice(0, 10);
  return {
    date, statut: "plan", joueur: `Joueur ${i + 1}`, equipe: "LAL", adversaire: "GSW", position: "G",
    projection: 50 - i, nb_matchs: 1, alternatives: [], ...extra,
  };
}

function plan(compte: string, premier: Partial<JourPlan30> = {}): TtflPlan30 {
  return {
    compte, profil: "equilibre", debut: AUJOURDHUI, reference: "2026-10-16", calcule_le: "2026-10-20T10:00:00Z",
    total_projection: 1000, reglages: { libelle: "Équilibrée", defaut: true },
    jours: Array.from({ length: 30 }, (_, i) => jour(i, i === 0 ? premier : {})),
  };
}

function rendre(compte: string, premier: Partial<JourPlan30>, verrous?: Record<string, string>) {
  return render(
    <PlanTrenteJours plans={[plan(compte, premier)]} compte={compte} zoneLabel={`Compte ${compte}`} mode="regular"
      aujourdhui={AUJOURDHUI} maintenantMs={MAINTENANT} verrous={verrous} />,
  );
}

beforeEach(() => {
  refresh.mockReset();
  verrouiller.mockReset();
  deverrouiller.mockReset();
});

describe("Pick manuel validé (compte 02)", () => {
  it("jamais proposé pour le compte 01", () => {
    rendre("01", { statut: "valide" });
    expect(screen.queryByText(/remplaçable par le robot/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /valider à la main/i })).not.toBeInTheDocument();
  });

  it("pick posé non verrouillé : « Valider à la main » verrouille le joueur du soir", async () => {
    verrouiller.mockResolvedValue({ ok: true, message: "Joueur 1 validé à la main." });
    rendre("02", { statut: "valide" });
    expect(screen.getByText("Pick remplaçable par le robot")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Valider à la main" }));
    await waitFor(() => expect(verrouiller).toHaveBeenCalledWith("regular", "2026-10-20", "Joueur 1"));
    expect(await screen.findByText("Joueur 1 validé à la main.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("joueur du plan pas encore posé : « Poser et valider à la main »", async () => {
    verrouiller.mockResolvedValue({ ok: true });
    rendre("02", { statut: "plan" });
    fireEvent.click(screen.getByRole("button", { name: "Poser et valider à la main" }));
    await waitFor(() => expect(verrouiller).toHaveBeenCalledTimes(1));
  });

  it("verrou actif sur le joueur posé : affiché, et « Déverrouiller » retire le verrou", async () => {
    deverrouiller.mockResolvedValue({ ok: true, message: "Verrou retiré." });
    rendre("02", { statut: "valide" }, { "2026-10-20": "Joueur 1" });
    expect(
      screen.getByText("Pick manuel validé : gardé même si un autre joueur devient n°1 (remplacé s'il est Out, Doubtful ou absent)"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Déverrouiller" }));
    await waitFor(() => expect(deverrouiller).toHaveBeenCalledWith("2026-10-20"));
    expect(verrouiller).not.toHaveBeenCalled();
  });

  it("le verrou ne vaut que pour le joueur verrouillé : un autre joueur posé = pas verrouillé", () => {
    rendre("02", { statut: "valide", joueur: "Autre Joueur" }, { "2026-10-20": "Joueur 1" });
    expect(screen.getByText("Pick remplaçable par le robot")).toBeInTheDocument();
  });

  it("une erreur du serveur (cycle de 30 jours) est affichée et rien n'est rafraîchi", async () => {
    verrouiller.mockResolvedValue({ ok: false, error: "Joueur 1 est déjà pické à 30 jours ou moins sur le(s) compte(s) 02." });
    rendre("02", { statut: "plan" });
    fireEvent.click(screen.getByRole("button", { name: "Poser et valider à la main" }));
    expect(await screen.findByText(/déjà pické à 30 jours/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});

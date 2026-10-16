import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import type { JourPlan30, TtflPlan30 } from "@/lib/plan30";

const refresh = vi.fn();
const lancerCommande = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/actions", () => ({ pickPlayerComptes: vi.fn() }));
vi.mock("@/app/(app)/admin/actions", () => ({ lancerCommande: (...a: unknown[]) => lancerCommande(...a) }));

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

function plan(profil: string, extra: Partial<TtflPlan30> = {}, prefixe = ""): TtflPlan30 {
  return {
    compte: "01", profil, debut: AUJOURDHUI, reference: "2026-10-16", calcule_le: "2026-10-20T10:00:00Z",
    total_projection: 1000, reglages: { libelle: profil.toUpperCase() },
    jours: Array.from({ length: 30 }, (_, i) => jour(i, { joueur: `${prefixe}Joueur ${i + 1}` })), ...extra,
  };
}

function rendre(plans: TtflPlan30[], props: { maintenantMs?: number } = {}) {
  return render(
    <PlanTrenteJours plans={plans} compte="01" zoneLabel="Compte 1" mode="regular" aujourdhui={AUJOURDHUI}
      maintenantMs={props.maintenantMs ?? MAINTENANT} />,
  );
}

beforeEach(() => {
  refresh.mockReset();
  lancerCommande.mockReset();
});

describe("Plan 30 jours", () => {
  it("sans plan : état vide et bouton pour le demander au PC", async () => {
    lancerCommande.mockResolvedValue({ ok: true, message: "Demandée : l'exécuteur du PC la prend en charge dans la minute.", details: [] });
    rendre([]);
    expect(screen.getByText("Aucun plan calculé pour l'instant.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recalculer le plan" }));
    await waitFor(() => expect(lancerCommande).toHaveBeenCalledWith("plan30"));
    expect(await screen.findByText(/Demandée/)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("une erreur de la file de commandes est affichée", async () => {
    lancerCommande.mockResolvedValue({ ok: false, error: "Cette action est déjà en attente ou en cours." });
    rendre([]);
    fireEvent.click(screen.getByRole("button", { name: "Recalculer le plan" }));
    expect(await screen.findByText("Cette action est déjà en attente ou en cours.")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("affiche la formule par défaut, la fenêtre et le total attendu", () => {
    rendre([plan("a", { reglages: { libelle: "A", ordre: 1 } }), plan("b", { reglages: { libelle: "B", ordre: 2, defaut: true } })]);
    expect(screen.getByText(/Plan 30 jours · Compte 1/)).toBeInTheDocument();
    expect(screen.getByText(/du 20\/10 au 18\/11/)).toBeInTheDocument();
    const onglets = within(screen.getByRole("tablist", { name: "Formule du plan" })).getAllByRole("tab");
    expect(onglets.map((o) => o.textContent)).toEqual(["A", "B"]);
    expect(onglets[1]).toHaveAttribute("aria-selected", "true");
  });

  it("liste déroulante : les 30 soirées, première soirée sélectionnée avec son détail", () => {
    rendre([plan("a")]);
    const select = screen.getByLabelText("Date du plan") as HTMLSelectElement;
    expect(select.options).toHaveLength(30);
    expect(select.value).toBe("2026-10-20");
    expect(screen.getAllByText("Joueur 1").length).toBeGreaterThan(0);
    expect(screen.getByText("LAL vs GSW · G")).toBeInTheDocument();
  });

  it("changer de date change le joueur affiché", () => {
    rendre([plan("a")]);
    expect(screen.getByText("Joueur 1", { selector: "p" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Date du plan"), { target: { value: "2026-10-25" } });
    expect(screen.getByText("Joueur 6", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("Joueur 1", { selector: "p" })).not.toBeInTheDocument();
  });

  it("changer de formule affiche le plan de cette formule sans rien demander au PC", () => {
    rendre([
      plan("a", { reglages: { libelle: "A", ordre: 1, defaut: true } }, "Alpha-"),
      plan("b", { reglages: { libelle: "B", ordre: 2 } }, "Beta-"),
    ]);
    expect(screen.getByText("Alpha-Joueur 1", { selector: "p" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByText("Beta-Joueur 1", { selector: "p" })).toBeInTheDocument();
    expect(lancerCommande).not.toHaveBeenCalled();
  });

  it("une seule formule : pas de sélecteur de formule", () => {
    rendre([plan("a")]);
    expect(screen.queryByRole("tablist", { name: "Formule du plan" })).not.toBeInTheDocument();
  });

  it("alternatives du jour, avec la soirée où le plan réserve déjà le joueur", () => {
    const p = plan("a");
    p.jours[0] = jour(0, {
      alternatives: [
        { joueur: "Second Choix", projection: 44.2, reserve_le: "2026-10-27" },
        { joueur: "Libre Choix", projection: 41.0, reserve_le: null },
      ],
    });
    rendre([p]);
    expect(screen.getByText("Second Choix")).toBeInTheDocument();
    expect(screen.getByText(/44\.2 pts · réservé le/)).toBeInTheDocument();
    expect(screen.getByText("41.0 pts")).toBeInTheDocument();
  });

  it("soirée déjà validée : signalée, pas de bouton pour la repicker", () => {
    const p = plan("a");
    p.jours[0] = jour(0, { statut: "valide", joueur: "Déjà Pické" });
    rendre([p]);
    expect(screen.getByText("Déjà pické pour cette soirée")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Picker" })).not.toBeInTheDocument();
  });

  it("soirée du plan : bouton Picker pour ce compte", () => {
    rendre([plan("a")]);
    expect(screen.getByRole("button", { name: "Picker" })).toBeInTheDocument();
  });

  it("soirée sans joueur disponible", () => {
    const p = plan("a");
    p.jours[0] = jour(0, { statut: "aucun", joueur: null, projection: null });
    rendre([p]);
    expect(screen.getByText(/Aucun joueur pour le/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Picker" })).not.toBeInTheDocument();
  });

  it("plan ancien : invite à relancer le calcul", () => {
    rendre([plan("a", { calcule_le: "2026-10-18T10:00:00Z" })]);
    expect(screen.getByText(/relance le calcul pour tenir compte des dernières blessures/)).toBeInTheDocument();
  });

  it("plan récent et complet : aucun avertissement", () => {
    rendre([plan("a")]);
    expect(screen.queryByText(/relance le calcul/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ne sont pas encore couverts/)).not.toBeInTheDocument();
  });

  it("fenêtre incomplète : le nombre de jours non couverts est annoncé", () => {
    const p = plan("a");
    p.jours = p.jours.slice(0, 20);
    rendre([p]);
    expect(screen.getByText(/Les 10 derniers jours de la fenêtre ne sont pas encore couverts/)).toBeInTheDocument();
  });

  it("explique comment la formule choisit", () => {
    rendre([plan("a", { reglages: { libelle: "A", marge_engagement: 5, poids_matchup_futur: 0.5 } })]);
    expect(screen.getByText("Comment cette formule choisit")).toBeInTheDocument();
    expect(screen.getByText(/au plus 5 pts de moins que le meilleur/)).toBeInTheDocument();
  });

  it("toutes les soirées passées : le dit et propose le recalcul", () => {
    const vieux = plan("a", { jours: [jour(-5), jour(-4)] });
    render(
      <PlanTrenteJours plans={[vieux]} compte="02" zoneLabel="Compte 2" mode="regular" aujourdhui={AUJOURDHUI}
        maintenantMs={MAINTENANT} />,
    );
    expect(screen.getByText(/Toutes les soirées de ce plan sont passées/)).toBeInTheDocument();
  });
});

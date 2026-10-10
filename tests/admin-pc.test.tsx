import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const lancerCommande = vi.fn();
const annulerCommande = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/(app)/admin/actions", () => ({
  lancerCommande: (...a: unknown[]) => lancerCommande(...a),
  annulerCommande: (...a: unknown[]) => annulerCommande(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { ActionsPC } = await import("@/components/admin/ActionsPC");
const { HistoriqueCommandes } = await import("@/components/admin/HistoriqueCommandes");

beforeEach(() => {
  lancerCommande.mockReset().mockResolvedValue({ ok: true, message: "Demandée : l'exécuteur du PC la prend en charge dans la minute.", details: [] });
  annulerCommande.mockReset().mockResolvedValue({ ok: true, message: "Annulée.", details: [] });
  refresh.mockReset();
});

describe("ActionsPC", () => {
  it("regroupe les actions par thème", () => {
    render(<ActionsPC actives={[]} />);
    for (const titre of ["Calculs et statistiques", "Données", "Synchronisation avec TTFL", "Suivi"]) {
      expect(screen.getByRole("heading", { name: titre })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Lancer : Mettre à jour le calendrier TTFL" })).toBeInTheDocument();
  });

  it("une action simple dépose la demande tout de suite, sans confirmation", async () => {
    render(<ActionsPC actives={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Lancer : Mettre à jour le calendrier TTFL" }));
    await waitFor(() => expect(lancerCommande).toHaveBeenCalledWith("calendrier", {}));
    expect(await screen.findByText(/l'exécuteur du PC la prend en charge/)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("une action qui écrit sur le site TTFL demande confirmation AVANT de rien déposer", async () => {
    render(<ActionsPC actives={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Lancer : Envoyer mes picks sur le site TTFL" }));
    const dialogue = screen.getByRole("dialog");
    expect(within(dialogue).getByText(/envoyés sur le site TTFL maintenant/)).toBeInTheDocument();
    expect(lancerCommande).not.toHaveBeenCalled();
    await userEvent.click(within(dialogue).getByRole("button", { name: "Annuler" }));
    expect(lancerCommande).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Lancer : Envoyer mes picks sur le site TTFL" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmer" }));
    await waitFor(() => expect(lancerCommande).toHaveBeenCalledWith("synchro_app", {}));
  });

  it("l'import des cotes prévient qu'il consomme du quota", async () => {
    render(<ActionsPC actives={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Lancer : Importer les cotes de paris" }));
    expect(within(screen.getByRole("dialog")).getByText(/quota The Odds API/)).toBeInTheDocument();
  });

  it("transmet la soirée choisie comme paramètre", async () => {
    render(<ActionsPC actives={[]} />);
    const champ = screen.getByLabelText("Soirée pour Capturer les scores réels d'un soir");
    await userEvent.type(champ, "2026-10-05");
    await userEvent.click(screen.getByRole("button", { name: "Lancer : Capturer les scores réels d'un soir" }));
    await waitFor(() => expect(lancerCommande).toHaveBeenCalledWith("capture_resultats", { date: "2026-10-05" }));
  });

  it("transmet le nombre de soirées choisi", async () => {
    render(<ActionsPC actives={[]} />);
    await userEvent.selectOptions(screen.getByLabelText("Nombre de soirées pour Recalculer les prochaines soirées"), "14");
    await userEvent.click(screen.getByRole("button", { name: "Lancer : Recalculer les prochaines soirées" }));
    await waitFor(() => expect(lancerCommande).toHaveBeenCalledWith("push_avance", { nuits: "14" }));
  });

  it("une action déjà en attente ou en cours est désactivée (pas de doublon)", () => {
    render(<ActionsPC actives={["calendrier"]} />);
    expect(screen.getByRole("button", { name: "Lancer : Mettre à jour le calendrier TTFL" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lancer : Recalculer ce soir" })).toBeEnabled();
  });

  it("affiche le refus du serveur", async () => {
    lancerCommande.mockResolvedValue({ ok: false, error: "Cette action est déjà en attente ou en cours." });
    render(<ActionsPC actives={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Lancer : Mettre à jour le calendrier TTFL" }));
    expect(await screen.findByText("Cette action est déjà en attente ou en cours.")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});

const cmd = (id: number, statut: string, extra = {}) => ({
  id, type: "calendrier", params: {}, statut, demande_le: "2026-10-10T14:00:00Z", debut_le: null, fin_le: null,
  resume: null, sortie: null, ...extra,
});

describe("HistoriqueCommandes", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] }));
  afterEach(() => vi.useRealTimers());

  it("montre libellé, statut, durée, résumé et le détail repliable", () => {
    render(<HistoriqueCommandes commandes={[
      cmd(2, "ok", { debut_le: "2026-10-10T14:00:05Z", fin_le: "2026-10-10T14:00:50Z", resume: "Terminée — 19 soirée(s)", sortie: "ligne A\nligne B" }),
      cmd(1, "echec", { resume: "Échec (code 1) — cookie expiré" }),
    ]} />);
    const lignes = screen.getAllByRole("listitem");
    expect(lignes[0]).toHaveTextContent("Mettre à jour le calendrier TTFL");
    expect(lignes[0]).toHaveTextContent("Terminée");
    expect(lignes[0]).toHaveTextContent("45 s");
    expect(lignes[0]).toHaveTextContent("19 soirée(s)");
    expect(lignes[0]).toHaveTextContent("ligne B");
    expect(lignes[1]).toHaveTextContent("Échec");
    expect(lignes[1]).toHaveTextContent("cookie expiré");
  });

  it("annuler n'est proposé que pour une demande EN ATTENTE", async () => {
    render(<HistoriqueCommandes commandes={[cmd(3, "en_attente"), cmd(2, "en_cours"), cmd(1, "ok")]} />);
    const boutons = screen.getAllByRole("button", { name: /Annuler la demande/ });
    expect(boutons).toHaveLength(1);
    await userEvent.click(boutons[0]);
    await waitFor(() => expect(annulerCommande).toHaveBeenCalledWith(3));
  });

  it("se rafraîchit seul toutes les 5 s tant qu'une demande est active, puis s'arrête", async () => {
    const { rerender } = render(<HistoriqueCommandes commandes={[cmd(1, "en_cours")]} />);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10000);
    expect(refresh).toHaveBeenCalledTimes(3);

    rerender(<HistoriqueCommandes commandes={[cmd(1, "ok")]} />);
    refresh.mockClear();
    vi.advanceTimersByTime(20000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("état vide", () => {
    render(<HistoriqueCommandes commandes={[]} />);
    expect(screen.getByText("Aucune demande pour l'instant.")).toBeInTheDocument();
  });
});

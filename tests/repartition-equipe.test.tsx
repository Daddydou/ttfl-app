import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { COMPTES_EQUIPE } from "@/lib/planning";

const listerJoueursDuSoir = vi.fn();
const pickRepartition = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/actions", () => ({
  listerJoueursDuSoir: (...a: unknown[]) => listerJoueursDuSoir(...a),
  pickRepartition: (...a: unknown[]) => pickRepartition(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { RepartitionEquipe } = await import("@/components/RepartitionEquipe");

const joueurs = [
  { player: "Luka Dončić", team: "LAL", opponent: "GSW", projection: 49.3, status: null, source: "avance" },
  { player: "Giannis Antetokounmpo", team: "MIL", opponent: "TOR", projection: 47.9, status: null, source: "avance" },
  { player: "Troisième Joueur", team: "BOS", opponent: "MIA", projection: 41.0, status: null, source: "avance" },
];

function rendre(props: Partial<React.ComponentProps<typeof RepartitionEquipe>> = {}) {
  render(
    <RepartitionEquipe mode="regular" date="2026-10-21" comptes={COMPTES_EQUIPE} bloques={{}}
      aUnPick={false} dejaPose={false} {...props} />,
  );
}

describe("RepartitionEquipe", () => {
  beforeEach(() => {
    listerJoueursDuSoir.mockReset().mockResolvedValue({ ok: true, joueurs, avanceSeule: true });
    pickRepartition.mockReset().mockResolvedValue({ ok: true });
    refresh.mockReset();
  });

  it("montre la proposition AVANT toute écriture : deux joueurs dans la marge, 5 comptes chacun", async () => {
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Répartir l'équipe" }));
    expect(await screen.findByText("Luka Dončić")).toBeInTheDocument();
    expect(screen.getByText("Giannis Antetokounmpo")).toBeInTheDocument();
    expect(screen.queryByText("Troisième Joueur")).not.toBeInTheDocument(); // à plus de 3 points du meilleur
    expect(screen.getAllByText(/5 comptes/)).toHaveLength(2);
    expect(screen.getByText(/Projections calculées à l'avance/)).toBeInTheDocument();
    expect(pickRepartition).not.toHaveBeenCalled(); // rien n'est enregistré sans « Valider »
  });

  it("« Valider » enregistre chaque joueur avec son groupe de comptes, tous les comptes une fois", async () => {
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Répartir l'équipe" }));
    await screen.findByText("Luka Dončić");
    await userEvent.click(screen.getByRole("button", { name: /Valider la répartition/ }));
    await waitFor(() => expect(pickRepartition).toHaveBeenCalledTimes(1));
    const [mode, date, groupes] = pickRepartition.mock.calls[0];
    expect(mode).toBe("regular");
    expect(date).toBe("2026-10-21");
    expect(groupes).toHaveLength(2);
    expect(groupes.flatMap((g: { comptes: string[] }) => g.comptes).sort()).toEqual([...COMPTES_EQUIPE].sort());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("prévient quand des picks existent déjà et sont posés sur le site (le robot les remplacera)", async () => {
    rendre({ aUnPick: true, dejaPose: true });
    await userEvent.click(screen.getByRole("button", { name: "Répartir l'équipe" }));
    expect(await screen.findByText(/déjà des picks/)).toBeInTheDocument();
    expect(screen.getByText(/déjà posés sur le site TTFL/)).toBeInTheDocument();
  });

  it("n'écrit rien et le dit s'il n'y a aucun joueur disponible", async () => {
    listerJoueursDuSoir.mockResolvedValue({ ok: true, joueurs: [], avanceSeule: true });
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Répartir l'équipe" }));
    expect(await screen.findByText("Aucun joueur disponible pour cette soirée.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Valider la répartition" })).toBeDisabled();
  });

  it("affiche l'erreur du serveur (cycle de 30 jours revérifié) sans fermer la fenêtre", async () => {
    pickRepartition.mockResolvedValue({ ok: false, error: "Luka Dončić est déjà pické à 30 jours ou moins sur le(s) compte(s) 04." });
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Répartir l'équipe" }));
    await screen.findByText("Luka Dončić");
    await userEvent.click(screen.getByRole("button", { name: /Valider la répartition/ }));
    expect(await screen.findByText(/déjà pické à 30 jours/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("ne propose pas à un compte un joueur qu'il a déjà pické (bloqué)", async () => {
    rendre({ bloques: { "luka doncic": ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] } });
    await userEvent.click(screen.getByRole("button", { name: "Répartir l'équipe" }));
    await screen.findByText("Giannis Antetokounmpo");
    expect(screen.queryByText("Luka Dončić")).not.toBeInTheDocument();
    expect(screen.getByText(/10 comptes :/)).toBeInTheDocument(); // la ligne du joueur, pas le libellé du bouton
  });
});

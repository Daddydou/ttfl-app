import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { COMPTES_EQUIPE } from "@/lib/planning";

const listerJoueursDuSoir = vi.fn();
const pickPlayerComptes = vi.fn();
const retirerPickComptes = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/actions", () => ({
  listerJoueursDuSoir: (...a: unknown[]) => listerJoueursDuSoir(...a),
  pickPlayerComptes: (...a: unknown[]) => pickPlayerComptes(...a),
  retirerPickComptes: (...a: unknown[]) => retirerPickComptes(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { EditionComptes } = await import("@/components/EditionComptes");

const joueurs = [
  { player: "Luka Dončić", team: "LAL", opponent: "GSW", projection: 49.3, status: null, source: "avance" },
  { player: "Giannis Antetokounmpo", team: "MIL", opponent: "TOR", projection: 47.9, status: null, source: "avance" },
];

function rendre(props: Partial<React.ComponentProps<typeof EditionComptes>> = {}) {
  render(
    <EditionComptes mode="regular" date="2026-10-21" comptes={COMPTES_EQUIPE}
      parCompte={{ "03": "Nikola Jokic", "04": "Nikola Jokic", "05": "Jayson Tatum" }}
      bloques={{}} dejaPose={false} {...props} />,
  );
}
const ouvrir = () => userEvent.click(screen.getByRole("button", { name: "Modifier certains comptes" }));
const cocher = (...comptes: string[]) =>
  Promise.all(comptes.map((c) => userEvent.click(screen.getByRole("checkbox", { name: `Compte ${c}` })))).then(() => undefined);

describe("EditionComptes — changements manuels sur x comptes", () => {
  beforeEach(() => {
    listerJoueursDuSoir.mockReset().mockResolvedValue({ ok: true, joueurs, avanceSeule: true });
    pickPlayerComptes.mockReset().mockResolvedValue({ ok: true });
    retirerPickComptes.mockReset().mockResolvedValue({ ok: true });
    refresh.mockReset();
  });

  it("montre le pick de CHAQUE compte, ou « aucun pick »", async () => {
    rendre();
    await ouvrir();
    expect(screen.getAllByRole("checkbox")).toHaveLength(10);
    expect(screen.getAllByText("Nikola Jokic")).toHaveLength(2);
    expect(screen.getByText("Jayson Tatum")).toBeInTheDocument();
    expect(screen.getAllByText("aucun pick")).toHaveLength(7);
  });

  it("n'offre aucun choix de joueur tant qu'aucun compte n'est coché", async () => {
    rendre();
    await ouvrir();
    expect(screen.getByText(/Coche au moins un compte/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Choisir un joueur|Changer/ })).not.toBeInTheDocument();
  });

  it("change le joueur des SEULS comptes cochés (03 et 05), pas des autres", async () => {
    rendre();
    await ouvrir();
    await cocher("03", "05");
    expect(screen.getByText("2 sélectionnés")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Changer" })); // des picks existent sur la sélection
    await userEvent.click(await screen.findByRole("button", { name: /Giannis Antetokounmpo/ }));
    await userEvent.click(screen.getByRole("button", { name: "Valider" }));
    await waitFor(() => expect(pickPlayerComptes).toHaveBeenCalledTimes(1));
    expect(pickPlayerComptes).toHaveBeenCalledWith("regular", "2026-10-21", "Giannis Antetokounmpo", ["03", "05"]);
  });

  it("« Tout sélectionner » puis « Aucun »", async () => {
    rendre();
    await ouvrir();
    await userEvent.click(screen.getByRole("button", { name: "Tout sélectionner" }));
    expect(screen.getByText("10 sélectionnés")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Aucun" }));
    expect(screen.getByText("0 sélectionné")).toBeInTheDocument();
  });

  it("un joueur n'est grisé que s'il est bloqué sur un compte COCHÉ", async () => {
    // Luka est bloqué (≤ 30 jours) sur le seul compte 04.
    rendre({ bloques: { "luka doncic": ["04"] } });
    await ouvrir();

    await cocher("03");
    await userEvent.click(screen.getByRole("button", { name: "Changer" }));
    expect(await screen.findByRole("button", { name: /Luka Dončić/ })).toBeEnabled(); // 04 n'est pas coché
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));

    await cocher("03", "04"); // décoche 03, coche 04 → la sélection devient [04], où Luka est bloqué
    await userEvent.click(screen.getByRole("button", { name: /Choisir un joueur|Changer/ }));
    expect(await screen.findByRole("button", { name: /Luka Dončić/ })).toBeDisabled();
    expect(screen.getByText(/bloqué \(compte 04\)/)).toBeInTheDocument();
  });

  it("permet de retirer le pick de la sélection seulement", async () => {
    rendre();
    await ouvrir();
    await cocher("03", "04");
    await userEvent.click(screen.getByRole("button", { name: /Retirer le pick/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Retirer ?" }));
    await waitFor(() => expect(retirerPickComptes).toHaveBeenCalledWith("regular", "2026-10-21", ["03", "04"]));
  });
});

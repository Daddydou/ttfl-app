import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const importerPicks = vi.fn();
const copierPicks = vi.fn();
const supprimerPicks = vi.fn();
vi.mock("@/app/(app)/admin/actions", () => ({
  importerPicks: (...a: unknown[]) => importerPicks(...a),
  copierPicks: (...a: unknown[]) => copierPicks(...a),
  supprimerPicks: (...a: unknown[]) => supprimerPicks(...a),
}));

const { PicksEnMasse } = await import("@/components/admin/PicksEnMasse");

const EQUIPE = ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const ok = (message: string, details: string[] = []) => ({ ok: true, message, details });

beforeEach(() => {
  importerPicks.mockReset().mockResolvedValue(ok("Vérifié : 2 pick(s) seraient importé(s) sur 10 compte(s)."));
  copierPicks.mockReset().mockResolvedValue(ok("Vérifié : 4 pick(s) seraient copié(s) sur 2 compte(s)."));
  supprimerPicks.mockReset().mockResolvedValue(ok("Vérifié : 3 pick(s) sur 1 compte(s) seraient supprimés."));
});

async function coller(texte: string) {
  await userEvent.click(screen.getByLabelText("Picks à importer"));
  await userEvent.paste(texte);
}

describe("Importer des picks", () => {
  it("reconnaît les lignes en direct et signale celles à corriger, avec leur numéro", async () => {
    render(<PicksEnMasse aujourdhui="2026-10-10" />);
    await coller("21/10 Nikola Jokic\npas une date\n22/10 Luka Doncic");
    expect(screen.getByText(/2/, { selector: "span.font-semibold" })).toBeInTheDocument();
    expect(screen.getByText(/1 ligne\(s\) à corriger/)).toBeInTheDocument();
    expect(screen.getByText(/Ligne 2 : format non reconnu/)).toBeInTheDocument();
  });

  it("le bouton d'écriture reste verrouillé tant que « Vérifier » n'a pas réussi", async () => {
    render(<PicksEnMasse aujourdhui="2026-10-10" />);
    await coller("21/10 Nikola Jokic\n22/10 Luka Doncic");
    const importer = screen.getByRole("button", { name: /Importer 2 pick/ });
    expect(importer).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    await waitFor(() => expect(importerPicks).toHaveBeenCalledTimes(1));
    expect(importerPicks).toHaveBeenCalledWith(
      "regular",
      [{ date: "2026-10-21", player: "Nikola Jokic" }, { date: "2026-10-22", player: "Luka Doncic" }],
      EQUIPE,
      false, // vérification : rien n'est écrit
    );
    expect(await screen.findByText(/seraient importé\(s\) sur 10 compte/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Importer 2 pick/ })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /Importer 2 pick/ }));
    await waitFor(() => expect(importerPicks).toHaveBeenCalledTimes(2));
    expect(importerPicks.mock.calls[1][3]).toBe(true); // écriture
  });

  it("modifier le texte ou les comptes APRÈS vérification reverrouille l'écriture", async () => {
    render(<PicksEnMasse aujourdhui="2026-10-10" />);
    await coller("21/10 Nikola Jokic");
    await userEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Importer 1 pick/ })).toBeEnabled());

    await userEvent.click(screen.getByRole("button", { name: "Compte 03" })); // décoche un compte
    expect(screen.getByRole("button", { name: /Importer 1 pick/ })).toBeDisabled();
  });

  it("affiche les picks refusés par le cycle de 30 jours", async () => {
    importerPicks.mockResolvedValue(ok("Vérifié : 9 pick(s) seraient importé(s) sur 9 compte(s). 1 refusé(s) par le cycle de 30 jours.",
      ["mer. 21 oct. · compte 03 · Nikola Jokic — déjà pické à 30 jours ou moins"]));
    render(<PicksEnMasse aujourdhui="2026-10-10" />);
    await coller("21/10 Nikola Jokic");
    await userEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(await screen.findByText(/compte 03 · Nikola Jokic — déjà pické/)).toBeInTheDocument();
  });

  it("sans ligne valide ou sans compte, on ne peut pas vérifier", async () => {
    render(<PicksEnMasse aujourdhui="2026-10-10" />);
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeDisabled();
    await coller("21/10 Nikola Jokic");
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Aucun" }));
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeDisabled();
  });
});

describe("Copier des picks", () => {
  it("vérifie puis copie d'un compte vers d'autres, sur la période choisie (30 jours par défaut)", async () => {
    render(<PicksEnMasse aujourdhui="2026-10-10" />);
    await userEvent.click(screen.getByRole("tab", { name: "Copier" }));
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeDisabled(); // aucune destination
    await userEvent.click(screen.getByRole("button", { name: "Compte 04" }));
    await userEvent.click(screen.getByRole("button", { name: "Compte 05" }));
    await userEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    await waitFor(() => expect(copierPicks).toHaveBeenCalledWith("regular", "03", ["04", "05"], "2026-10-10", "2026-11-09", false));
    await userEvent.click(await screen.findByRole("button", { name: /Copier vers 2 compte/ }));
    await waitFor(() => expect(copierPicks).toHaveBeenCalledTimes(2));
    expect(copierPicks.mock.calls[1][5]).toBe(true);
  });
});

describe("Supprimer des picks", () => {
  it("exige une vérification PUIS la saisie du mot SUPPRIMER avant d'écrire", async () => {
    render(<PicksEnMasse aujourdhui="2026-10-10" />);
    await userEvent.click(screen.getByRole("tab", { name: "Supprimer" }));
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Compte 03" }));
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeDisabled();
    expect(screen.queryByLabelText("Confirmation")).not.toBeInTheDocument(); // pas de champ avant vérification

    await userEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    await waitFor(() => expect(supprimerPicks).toHaveBeenCalledWith("regular", ["03"], "2026-10-10", "2026-11-09", "", false));
    const champ = await screen.findByLabelText("Confirmation");
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeDisabled();

    await userEvent.type(champ, "supprimer"); // minuscules : ne suffit pas
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeDisabled();
    await userEvent.clear(champ);
    await userEvent.type(champ, "SUPPRIMER");
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(supprimerPicks).toHaveBeenCalledWith("regular", ["03"], "2026-10-10", "2026-11-09", "SUPPRIMER", true));
  });

  it("rappelle que le site TTFL n'est pas touché et que l'historique est protégé", async () => {
    render(<PicksEnMasse aujourdhui="2026-10-10" />);
    await userEvent.click(screen.getByRole("tab", { name: "Supprimer" }));
    expect(screen.getByText(/rien n'est retiré sur le site TTFL/)).toBeInTheDocument();
    expect(screen.getByText(/picks passés sont\s+protégés/)).toBeInTheDocument();
  });
});

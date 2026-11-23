import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { COMPTES_EQUIPE } from "@/lib/planning";

// x2 posable partout où l'on pose / modifie un joueur (23/11/2026) : case « poser aussi le x2 » dans chaque fenêtre de
// choix, bouton « ×2 » sur un pick déjà posé. Les écrans ne calculent rien : ils passent la demande au serveur.
const pickPlayerComptes = vi.fn();
const pickRepartition = vi.fn();
const listerJoueursDuSoir = vi.fn();
const retirerPickComptes = vi.fn();
const poserX2Comptes = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/actions", () => ({
  pickPlayerComptes: (...a: unknown[]) => pickPlayerComptes(...a),
  pickRepartition: (...a: unknown[]) => pickRepartition(...a),
  listerJoueursDuSoir: (...a: unknown[]) => listerJoueursDuSoir(...a),
  retirerPickComptes: (...a: unknown[]) => retirerPickComptes(...a),
}));
vi.mock("@/app/(app)/admin/x2-actions", () => ({ poserX2Comptes: (...a: unknown[]) => poserX2Comptes(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { PickZoneButton } = await import("@/components/PickZoneButton");
const { NuitPicker } = await import("@/components/NuitPicker");
const { RepartitionEquipe } = await import("@/components/RepartitionEquipe");

const DATE = "2026-12-15";
const joueurs = [
  { player: "Luka Dončić", team: "LAL", opponent: "GSW", projection: 49.3, status: null, source: "avance" },
  { player: "Giannis Antetokounmpo", team: "MIL", opponent: "TOR", projection: 47.9, status: null, source: "avance" },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-23T12:00:00Z"));
  for (const f of [pickPlayerComptes, pickRepartition, retirerPickComptes, poserX2Comptes]) f.mockReset().mockResolvedValue({ ok: true, message: "ok" });
  listerJoueursDuSoir.mockReset().mockResolvedValue({ ok: true, joueurs, avanceSeule: false });
  refresh.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("PickZoneButton : Conseillés, Plan 30, alertes", () => {
  const rendre = (props: Partial<React.ComponentProps<typeof PickZoneButton>> = {}) =>
    render(<PickZoneButton mode="regular" date={DATE} player="Luka Dončić" comptes={["01"]} zoneLabel="Compte 1" dejaPicke={false} {...props} />);

  it("case décochée par défaut : le pick part SANS x2", async () => {
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Picker" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    await waitFor(() => expect(pickPlayerComptes).toHaveBeenCalledWith("regular", DATE, "Luka Dončić", ["01"], false));
  });

  it("case cochée : le pick part AVEC le x2", async () => {
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Picker" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Poser aussi le x2 de décembre 2026/ }));
    expect(screen.getByText(/déplacé sur cette soirée/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    await waitFor(() => expect(pickPlayerComptes).toHaveBeenCalledWith("regular", DATE, "Luka Dončić", ["01"], true));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("x2 refusé par le serveur : l'erreur s'affiche et la fenêtre reste ouverte", async () => {
    pickPlayerComptes.mockResolvedValue({ ok: false, error: "Ce joueur a déjà reçu un x2 sur le compte 01 (novembre 2026)." });
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Picker" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Poser aussi le x2/ }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(await screen.findByText(/déjà reçu un x2/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("pas de case pour une soirée passée ni hors saison du x2", async () => {
    rendre({ date: "2026-11-20" });
    await userEvent.click(screen.getByRole("button", { name: "Picker" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("joueur DÉJÀ pické : bouton « ×2 » en deux temps, sans changer de joueur", async () => {
    rendre({ dejaPicke: true, comptes: ["03", "04"] });
    expect(screen.getByText("Pické")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Poser le x2 sur ce pick" }));
    expect(poserX2Comptes).not.toHaveBeenCalled(); // premier appui = armer seulement
    await userEvent.click(screen.getByRole("button", { name: /Confirmer : poser le x2/ }));
    await waitFor(() => expect(poserX2Comptes).toHaveBeenCalledWith(DATE, ["03", "04"]));
    expect(pickPlayerComptes).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("ok");
  });

  it("joueur déjà pické sur une soirée passée : pas de bouton « ×2 »", () => {
    rendre({ dejaPicke: true, date: "2026-11-20" });
    expect(screen.queryByRole("button", { name: /x2/ })).not.toBeInTheDocument();
  });
});

describe("NuitPicker : Mes picks, modifier certains comptes", () => {
  const rendre = (props: Partial<React.ComponentProps<typeof NuitPicker>> = {}) =>
    render(<NuitPicker mode="regular" date={DATE} zoneLabel="Équipe" comptes={["03", "05"]} aUnPick={false} dejaPose={false} bloques={{}} {...props} />);

  it("choisir un joueur AVEC le x2 du mois", async () => {
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Choisir un joueur" }));
    await userEvent.click(await screen.findByRole("button", { name: /Giannis Antetokounmpo/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Poser aussi le x2/ }));
    expect(screen.getByText(/\(2 comptes\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Valider" }));
    await waitFor(() => expect(pickPlayerComptes).toHaveBeenCalledWith("regular", DATE, "Giannis Antetokounmpo", ["03", "05"], true));
  });

  it("pick existant : « Changer », « ×2 » et « Retirer » côte à côte", () => {
    rendre({ aUnPick: true });
    expect(screen.getByRole("button", { name: "Changer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Poser le x2 sur ce pick" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retirer le pick/ })).toBeInTheDocument();
  });

  it("aucun pick : pas de bouton « ×2 » (rien à qui le lier)", () => {
    rendre({ aUnPick: false });
    expect(screen.queryByRole("button", { name: /x2/ })).not.toBeInTheDocument();
  });
});

describe("RepartitionEquipe : x2 par groupe de comptes", () => {
  const rendre = () =>
    render(<RepartitionEquipe mode="regular" date={DATE} comptes={COMPTES_EQUIPE} bloques={{}} aUnPick={false} dejaPose={false} />);

  it("sans case cochée : aucun compte ne reçoit de x2", async () => {
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Répartir l'équipe" }));
    await screen.findByText("Luka Dončić");
    await userEvent.click(screen.getByRole("button", { name: /Valider la répartition/ }));
    await waitFor(() => expect(pickRepartition).toHaveBeenCalledTimes(1));
    expect(pickRepartition.mock.calls[0][3]).toEqual([]);
  });

  it("case cochée sur un joueur : les comptes de CE groupe reçoivent le x2", async () => {
    rendre();
    await userEvent.click(screen.getByRole("button", { name: "Répartir l'équipe" }));
    await screen.findByText("Luka Dončić");
    await userEvent.click(screen.getByRole("checkbox", { name: /Poser aussi le x2 de décembre 2026 sur Luka Dončić/ }));
    await userEvent.click(screen.getByRole("button", { name: /Valider la répartition/ }));
    await waitFor(() => expect(pickRepartition).toHaveBeenCalledTimes(1));
    const [, , groupes, x2Comptes] = pickRepartition.mock.calls[0];
    const groupeLuka = groupes.find((g: { player: string }) => g.player === "Luka Dončić");
    expect([...x2Comptes].sort()).toEqual([...groupeLuka.comptes].sort());
    expect(x2Comptes.length).toBeLessThan(10);
  });
});

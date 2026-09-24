import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pickPlayer = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/actions", () => ({ pickPlayer: (...a: unknown[]) => pickPlayer(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { PickButton } = await import("@/components/PickButton");

describe("PickButton", () => {
  beforeEach(() => {
    pickPlayer.mockReset();
    refresh.mockReset();
  });

  it("demande confirmation avant d'enregistrer le pick", async () => {
    pickPlayer.mockResolvedValue({ ok: true });
    render(<PickButton mode="regular" pickDate="2026-03-10" player="Jayson Tatum" alreadyPicked={false} variant="primary" />);

    await userEvent.click(screen.getByRole("button", { name: "J'ai pické Tatum" }));
    expect(pickPlayer).not.toHaveBeenCalled();
    expect(screen.getByText("Confirmer le pick")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(pickPlayer).toHaveBeenCalledWith("regular", "2026-03-10", "Jayson Tatum");
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByText("Confirmer le pick")).not.toBeInTheDocument();
  });

  it("affiche l'erreur renvoyée par le serveur", async () => {
    pickPlayer.mockResolvedValue({ ok: false, error: "Joueur bloqué par le cycle" });
    render(<PickButton mode="regular" pickDate="2026-03-10" player="Jayson Tatum" alreadyPicked={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Picker" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(await screen.findByText("Joueur bloqué par le cycle")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("annuler ferme la confirmation sans rien enregistrer", async () => {
    render(<PickButton mode="regular" pickDate="2026-03-10" player="Jayson Tatum" alreadyPicked={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Picker" }));
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByText("Confirmer le pick")).not.toBeInTheDocument();
    expect(pickPlayer).not.toHaveBeenCalled();
  });

  it("n'affiche qu'un badge si le joueur est déjà pické", () => {
    render(<PickButton mode="regular" pickDate="2026-03-10" player="Jayson Tatum" alreadyPicked />);
    expect(screen.getByText("✓ Pické")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

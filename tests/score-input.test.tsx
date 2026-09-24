import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setScore = vi.fn();
const deletePick = vi.fn();
vi.mock("@/app/actions", () => ({
  setScore: (...a: unknown[]) => setScore(...a),
  deletePick: (...a: unknown[]) => deletePick(...a),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { ScoreInput } = await import("@/components/ScoreInput");
const { DeletePickButton } = await import("@/components/DeletePickButton");

describe("ScoreInput", () => {
  beforeEach(() => setScore.mockReset().mockResolvedValue({ ok: true }));

  it("enregistre le score arrondi à la validation (Entrée)", async () => {
    render(<ScoreInput pickId={7} score={null} />);
    await userEvent.type(screen.getByRole("spinbutton"), "41.6{Enter}");
    expect(setScore).toHaveBeenCalledWith(7, 42);
  });

  it("n'appelle pas le serveur si le score n'a pas changé", async () => {
    render(<ScoreInput pickId={7} score={30} />);
    await userEvent.click(screen.getByRole("spinbutton"));
    await userEvent.tab();
    expect(setScore).not.toHaveBeenCalled();
  });

  it("vider le champ efface le score", async () => {
    render(<ScoreInput pickId={7} score={30} />);
    await userEvent.clear(screen.getByRole("spinbutton"));
    await userEvent.tab();
    expect(setScore).toHaveBeenCalledWith(7, null);
  });
});

describe("DeletePickButton", () => {
  beforeEach(() => deletePick.mockReset().mockResolvedValue({ ok: true }));

  it("demande un second clic avant de supprimer", async () => {
    render(<DeletePickButton pickId={3} player="Jayson Tatum" />);
    await userEvent.click(screen.getByLabelText("Supprimer le pick Jayson Tatum"));
    expect(deletePick).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Supprimer ?" }));
    expect(deletePick).toHaveBeenCalledWith(3);
  });
});

import { describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Faux canal realtime : on capture le callback pour simuler un push du PC.
let onInsert: (payload: { new: unknown }) => void = () => {};
const channel = {
  on: (_e: string, _f: unknown, cb: typeof onInsert) => {
    onInsert = cb;
    return channel;
  },
  subscribe: () => channel,
};
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ channel: () => channel, removeChannel: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...p}>{children}</a>,
}));

const { NewRunNotifier } = await import("@/components/NewRunNotifier");

describe("NewRunNotifier", () => {
  it("n'affiche rien tant qu'aucun run n'arrive, puis un bandeau refermable", async () => {
    render(<NewRunNotifier />);
    expect(screen.queryByText("Nouvelles projections")).not.toBeInTheDocument();

    act(() => onInsert({ new: { id: 2, game_date: "2026-03-10", mode: "regular" } }));
    expect(screen.getByText("Nouvelles projections")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir" })).toHaveAttribute("href", "/ce-soir");

    await userEvent.click(screen.getByLabelText("Fermer"));
    expect(screen.queryByText("Nouvelles projections")).not.toBeInTheDocument();
  });
});

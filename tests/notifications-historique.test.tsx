import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";
import { libelleSource, heureParisCourte } from "@/lib/notifications-historique";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/components/admin/PushToggle", () => ({ PushToggle: () => <div>push</div> }));
vi.mock("@/app/(app)/push-actions", () => ({ enregistrerAbonnement: vi.fn(), supprimerAbonnement: vi.fn() }));

const { default: Page } = await import("@/app/(app)/admin/notifications/page");

describe("lib/notifications-historique", () => {
  it("nomme les trois sources", () => {
    expect(libelleSource("base")).toBe("Base de données");
    expect(libelleSource("moteur")).toBe("Moteur");
    expect(libelleSource("robot")).toBe("Robot");
  });
  it("affiche l'heure de Paris (UTC+1 en hiver)", () => {
    expect(heureParisCourte("2026-11-10T22:28:00Z")).toBe("10/11 à 23:28");
  });
  it("ne plante pas sur une date illisible", () => {
    expect(heureParisCourte("n'importe quoi")).toBe("");
  });
});

describe("Page Admin > Notifications", () => {
  it("liste les notifications enregistrées", async () => {
    createClient.mockResolvedValue(fakeSupabase({
      ttfl_notifications_historique: [
        { id: 2, le: "2026-11-10T22:28:00Z", source: "robot", titre: "Contrôle 23 h 28", corps: "Rien à remplacer", priorite: "default", envoye: true },
        { id: 1, le: "2026-11-10T08:00:00Z", source: "base", titre: "Cookies", corps: null, priorite: "4", envoye: true },
      ],
    }));
    render(await Page());
    expect(screen.getByText("Contrôle 23 h 28")).toBeTruthy();
    expect(screen.getByText("Rien à remplacer")).toBeTruthy();
    expect(screen.getByText("Cookies")).toBeTruthy();
  });
  it("explique quand l'historique est vide", async () => {
    createClient.mockResolvedValue(fakeSupabase({ ttfl_notifications_historique: [] }));
    render(await Page());
    expect(screen.getByText(/Rien d.enregistré/)).toBeTruthy();
  });
});

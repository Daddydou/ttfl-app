import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { cleVapidEnOctets, validerAbonnement, VAPID_PUBLIC_KEY } from "@/lib/push";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
const { enregistrerAbonnement, supprimerAbonnement } = await import("@/app/(app)/push-actions");
const { PushToggle } = await import("@/components/admin/PushToggle");

const bon = { endpoint: "https://push.example.com/abc", p256dh: "p".repeat(87), auth: "a".repeat(22), appareil: "iPhone" };

describe("lib/push", () => {
  it("la clé publique VAPID fait 65 octets (point P-256 non compressé)", () => {
    const o = cleVapidEnOctets(VAPID_PUBLIC_KEY);
    expect(o).toHaveLength(65);
    expect(o[0]).toBe(4);
  });
  it("valide un abonnement correct", () => {
    expect(validerAbonnement(bon)).toMatchObject({ ok: true });
  });
  it("refuse un abonnement douteux", () => {
    expect(validerAbonnement(null).ok).toBe(false);
    expect(validerAbonnement({ ...bon, endpoint: "http://x" }).ok).toBe(false);
    expect(validerAbonnement({ ...bon, p256dh: "court" }).ok).toBe(false);
    expect(validerAbonnement({ ...bon, auth: undefined }).ok).toBe(false);
  });
});

describe("actions push", () => {
  const upsert = vi.fn();
  const eq = vi.fn();
  beforeEach(() => {
    upsert.mockReset().mockResolvedValue({ error: null });
    eq.mockReset().mockResolvedValue({ error: null });
  });
  const client = (user: unknown) => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({ upsert, delete: () => ({ eq }) }),
  });

  it("enregistre l'abonnement d'un utilisateur connecté", async () => {
    createClient.mockResolvedValue(client({ id: "u" }));
    expect(await enregistrerAbonnement(bon)).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ endpoint: bon.endpoint }), { onConflict: "endpoint" });
  });
  it("refuse sans session et sans toucher la base", async () => {
    createClient.mockResolvedValue(client(null));
    expect((await enregistrerAbonnement(bon)).ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("refuse un abonnement invalide", async () => {
    createClient.mockResolvedValue(client({ id: "u" }));
    expect((await enregistrerAbonnement({ endpoint: "x" })).ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("supprime un abonnement", async () => {
    createClient.mockResolvedValue(client({ id: "u" }));
    expect(await supprimerAbonnement(bon.endpoint)).toEqual({ ok: true });
    expect(eq).toHaveBeenCalledWith("endpoint", bon.endpoint);
  });
});

describe("bouton de notifications", () => {
  it("explique quand le navigateur ne gère pas le push", async () => {
    render(<PushToggle />);
    expect(await screen.findByText(/ne gère pas les notifications/)).toBeInTheDocument();
  });
});

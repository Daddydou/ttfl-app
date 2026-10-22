import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fakeSupabase } from "./fakeSupabase";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

const { default: JournalPage } = await import("@/app/(app)/admin/journal/page");

beforeEach(() => {
  createClient.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T16:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const base = { consequence: null, resultat: "ok", origine: "systeme", compte: null, soiree: null, joueur: null, cause_id: null };
const lignes = [
  { ...base, id: 3, le: "2026-10-22T15:00:00Z", categorie: "calcul", action: "Projections recalculées pour la soirée du 22/10", cause_id: 1,
    consequence: "42 joueurs candidats" },
  { ...base, id: 2, le: "2026-10-22T14:00:00Z", categorie: "pick", action: "Pick enregistré dans l'application", compte: "03", soiree: "2026-10-23", joueur: "Joueur Visible" },
  { ...base, id: 1, le: "2026-10-22T14:59:00Z", categorie: "commande", action: "Demande depuis l'application : Recalculer ce soir", origine: "app" },
  { ...base, id: 4, le: "2026-10-22T13:00:00Z", categorie: "pick", action: "Pré-pick posé", compte: "02", soiree: "2026-10-23", joueur: "Joueur Secret" },
];

async function rendre(tables: Record<string, unknown[]>, params: { f?: string; p?: string } = {}) {
  createClient.mockResolvedValue(fakeSupabase(tables));
  render(await JournalPage({ searchParams: Promise.resolve(params) }));
}

describe("Page Journal", () => {
  it("montre les actions et range la conséquence sous la demande", async () => {
    await rendre({ ttfl_journal: lignes });
    expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();
    expect(screen.getByText("Demande depuis l'application : Recalculer ce soir")).toBeInTheDocument();
    expect(screen.getByText("Conséquences")).toBeInTheDocument();
    expect(screen.getByText("Projections recalculées pour la soirée du 22/10")).toBeInTheDocument();
    expect(screen.getByText(/Joueur Visible/)).toBeInTheDocument();
  });

  it("cache le joueur du compte 02 tant que la soirée est secrète", async () => {
    await rendre({
      ttfl_journal: lignes,
      ttfl_secret_reglage: [{ id: 1, actif: true, compte: "02", profil: "prudent" }],
      ttfl_secret_pick: [{ soiree: "2026-10-23", cloture: "2026-10-23T20:00:00+00:00", revele_le: null, motif: null }],
    });
    expect(screen.queryByText(/Joueur Secret/)).not.toBeInTheDocument();
    expect(screen.queryByText("Pré-pick posé")).not.toBeInTheDocument();
    expect(screen.getByText(/Joueur Visible/)).toBeInTheDocument();
  });

  it("lecture du secret impossible : le compte 02 reste caché", async () => {
    createClient.mockResolvedValue({
      from(table: string) {
        const q: Record<string, unknown> = {};
        const rows = table === "ttfl_journal" ? lignes : [];
        const err = table === "ttfl_secret_reglage" ? { message: "boom" } : null;
        q.then = (r: (v: unknown) => unknown) => r({ data: err ? null : rows, error: err });
        q.maybeSingle = async () => ({ data: null, error: err });
        for (const m of ["select", "eq", "gte", "order", "limit", "returns"]) q[m] = () => q;
        return q;
      },
    });
    render(await JournalPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText(/Joueur Secret/)).not.toBeInTheDocument();
  });

  it("le filtre « Problèmes » ne garde que les échecs et alertes", async () => {
    await rendre({ ttfl_journal: [...lignes, { ...base, id: 9, le: "2026-10-22T15:30:00Z", categorie: "robot", action: "Veilleur : picks manquants", resultat: "alerte" }] }, { f: "problemes" });
    expect(screen.getByText("Veilleur : picks manquants")).toBeInTheDocument();
    expect(screen.queryByText("Pré-pick posé")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Problèmes" })).toHaveAttribute("aria-current", "true");
  });

  it("dit que le journal n'est pas activé si la table n'existe pas", async () => {
    createClient.mockResolvedValue({
      from() {
        const q: Record<string, unknown> = {};
        q.then = (r: (v: unknown) => unknown) => r({ data: null, error: { message: "relation does not exist" } });
        q.maybeSingle = async () => ({ data: null, error: null });
        for (const m of ["select", "eq", "gte", "order", "limit", "returns"]) q[m] = () => q;
        return q;
      },
    });
    render(await JournalPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/Journal pas encore activé/)).toBeInTheDocument();
  });

  it("journal vide : message clair", async () => {
    await rendre({ ttfl_journal: [] });
    expect(screen.getByText("Rien à signaler sur cette période.")).toBeInTheDocument();
  });
});

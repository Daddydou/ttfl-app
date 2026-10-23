// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rechercher, rechercheValide, versCsv, type EntreeJournal } from "@/lib/journal";
import { fakeSupabase } from "./fakeSupabase";

let n = 100;
function e(p: Partial<EntreeJournal>): EntreeJournal {
  n += 1;
  return {
    id: n, le: "2026-10-22T10:00:00Z", categorie: "pick", action: "Action", consequence: null,
    resultat: "ok", origine: "systeme", compte: null, soiree: null, joueur: null, cause_id: null, ...p,
  };
}

describe("recherche dans le journal", () => {
  const liste = [
    e({ action: "Pick enregistré", joueur: "Joueur Visible", compte: "03" }),
    e({ action: "Recalcul", consequence: "42 candidats" }),
    e({ action: "Envoi", soiree: "2026-10-23" }),
  ];
  it("cherche sans tenir compte des majuscules, dans tous les champs", () => {
    expect(rechercher(liste, "visible")).toHaveLength(1);
    expect(rechercher(liste, "CANDIDATS")).toHaveLength(1);
    expect(rechercher(liste, "2026-10-23")).toHaveLength(1);
    expect(rechercher(liste, "03")).toHaveLength(1);
  });
  it("recherche vide = tout ; introuvable = rien", () => {
    expect(rechercher(liste, "  ")).toHaveLength(3);
    expect(rechercher(liste, undefined)).toHaveLength(3);
    expect(rechercher(liste, "zzz")).toHaveLength(0);
  });
  it("limite la longueur de la recherche", () => {
    expect(rechercheValide("a".repeat(200))).toHaveLength(60);
    expect(rechercheValide(undefined)).toBe("");
  });
});

describe("export CSV", () => {
  it("met un en-tête, double les guillemets et neutralise les formules", () => {
    const csv = versCsv([e({ action: 'Dit "bonjour"', joueur: "=SOMME(A1)", consequence: "a;b" })]);
    const lignes = csv.replace("﻿", "").trim().split("\r\n");
    expect(lignes[0]).toContain('"Date (Paris)";"Catégorie";"Action"');
    expect(lignes[1]).toContain('"Dit ""bonjour"""');
    expect(lignes[1]).toContain(`"'=SOMME(A1)"`);
    expect(lignes[1]).toContain('"a;b"');
  });
  it("journal vide : seulement l'en-tête", () => {
    expect(versCsv([]).trim().split("\r\n")).toHaveLength(1);
  });
});

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
const { GET } = await import("@/app/(app)/admin/journal/export/route");

describe("route d'export", () => {
  beforeEach(() => {
    createClient.mockReset();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T16:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const lignes = [
    { id: 1, le: "2026-10-22T14:00:00Z", categorie: "pick", action: "Pick visible", consequence: null, resultat: "ok", origine: "app", compte: "03", soiree: "2026-10-23", joueur: "Joueur Visible", cause_id: null },
    { id: 2, le: "2026-10-22T13:00:00Z", categorie: "pick", action: "Pré-pick posé", consequence: null, resultat: "ok", origine: "app", compte: "02", soiree: "2026-10-23", joueur: "Joueur Secret", cause_id: null },
  ];
  const avecUtilisateur = (tables: Record<string, unknown[]>, user: unknown) => ({
    ...fakeSupabase(tables),
    auth: { getUser: async () => ({ data: { user } }) },
  });

  it("refuse si personne n'est connecté", async () => {
    createClient.mockResolvedValue(avecUtilisateur({ ttfl_journal: lignes }, null));
    const r = await GET(new Request("http://x/admin/journal/export"));
    expect(r.status).toBe(401);
  });

  it("renvoie un CSV et masque le pick secret", async () => {
    createClient.mockResolvedValue(
      avecUtilisateur(
        {
          ttfl_journal: lignes,
          ttfl_secret_reglage: [{ id: 1, actif: true, compte: "02", profil: "prudent" }],
          ttfl_secret_pick: [{ soiree: "2026-10-23", cloture: "2026-10-23T20:00:00+00:00", revele_le: null, motif: null }],
        },
        { id: "u" },
      ),
    );
    const r = await GET(new Request("http://x/admin/journal/export?p=7"));
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toContain("text/csv");
    expect(r.headers.get("Content-Disposition")).toContain("journal-ttfl-2026-10-22.csv");
    const texte = await r.text();
    expect(texte).toContain("Joueur Visible");
    expect(texte).not.toContain("Joueur Secret");
    expect(texte).not.toContain("Pré-pick posé");
  });

  it("applique la recherche", async () => {
    createClient.mockResolvedValue(avecUtilisateur({ ttfl_journal: lignes }, { id: "u" }));
    const r = await GET(new Request("http://x/admin/journal/export?q=visible"));
    const texte = await r.text();
    expect(texte).toContain("Pick visible");
    expect(texte).not.toContain("Pré-pick posé");
  });
});

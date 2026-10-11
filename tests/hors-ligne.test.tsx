import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CLE_HORS_LIGNE,
  MAX_PICKS_A_VENIR,
  construirePhoto,
  effacerPhoto,
  ecrirePhoto,
  lirePhoto,
} from "@/lib/hors-ligne";
import { EffacerHorsLigne, SauvegardeHorsLigne } from "@/components/SauvegardeHorsLigne";
import { config } from "@/proxy";

const racine = process.cwd();
const lire = (f: string) => readFileSync(join(racine, f), "utf8");

const aVenir = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ pick_date: `2026-10-${String(20 + i).padStart(2, "0")}`, player: `Joueur ${i}` }));

describe("photo hors ligne", () => {
  beforeEach(() => window.localStorage.clear());

  it("garde au plus 7 picks à venir et renomme les champs", () => {
    const p = construirePhoto({ soiree: "2026-10-20", pickDuSoir: "Joueur 0", aVenir: aVenir(12) }, new Date("2026-10-11T10:00:00Z"));
    expect(p.aVenir).toHaveLength(MAX_PICKS_A_VENIR);
    expect(p.aVenir[0]).toEqual({ date: "2026-10-20", joueur: "Joueur 0" });
    expect(p.enregistreLe).toBe("2026-10-11T10:00:00.000Z");
  });

  it("écrit puis relit la même photo", () => {
    const p = construirePhoto({ soiree: "2026-10-20", pickDuSoir: "Joueur 0", aVenir: aVenir(2) });
    expect(ecrirePhoto(p)).toBe(true);
    expect(lirePhoto()).toEqual(p);
  });

  it("ne plante pas si le stockage est bloqué ou le contenu corrompu", () => {
    const casse = { setItem: () => { throw new Error("bloqué"); }, getItem: () => "{pas du json", removeItem: () => { throw new Error("bloqué"); } };
    expect(ecrirePhoto(construirePhoto({ soiree: null, pickDuSoir: null, aVenir: [] }), casse)).toBe(false);
    expect(lirePhoto(casse)).toBeNull();
    expect(() => effacerPhoto(casse)).not.toThrow();
  });

  it("refuse une photo de forme inattendue", () => {
    window.localStorage.setItem(CLE_HORS_LIGNE, JSON.stringify({ enregistreLe: 3, aVenir: "x" }));
    expect(lirePhoto()).toBeNull();
  });

  it("l'accueil enregistre la photo, la page de connexion l'efface", () => {
    render(<SauvegardeHorsLigne soiree="2026-10-20" pickDuSoir="Joueur 0" aVenir={aVenir(2)} />);
    expect(lirePhoto()?.pickDuSoir).toBe("Joueur 0");
    render(<EffacerHorsLigne />);
    expect(window.localStorage.getItem(CLE_HORS_LIGNE)).toBeNull();
  });
});

describe("PWA : hors ligne et raccourcis", () => {
  it("le service worker précache la page hors ligne et ne la sert qu'en cas d'échec réseau", () => {
    const sw = lire("public/sw.js");
    expect(sw).toContain('"/hors-ligne.html"');
    expect(sw).toMatch(/request\.mode === "navigate"/);
    expect(sw).toMatch(/fetch\(request\)\.catch/);
    // jamais de mise en cache dynamique des pages : pas de cache.put
    expect(sw).not.toMatch(/\.put\(/);
  });

  it("la page hors ligne n'exige pas de connexion (exclue du proxy d'authentification)", () => {
    const motif = new RegExp("^" + config.matcher[0] + "$");
    expect(motif.test("/hors-ligne.html")).toBe(false); // exclue
    expect(motif.test("/ce-soir")).toBe(true); // les pages restent protégées
  });

  it("la page hors ligne lit la même clé de stockage que l'appli", () => {
    expect(lire("public/hors-ligne.html")).toContain(CLE_HORS_LIGNE);
  });

  it("le manifeste déclare les raccourcis vers le pick du soir, les conseillés et la semaine", () => {
    const m = JSON.parse(lire("public/manifest.webmanifest"));
    const urls = m.shortcuts.map((s: { url: string }) => s.url);
    expect(urls).toEqual(["/", "/ce-soir", "/equipe"]);
    for (const s of m.shortcuts) expect(s.name.length).toBeGreaterThan(0);
  });
});

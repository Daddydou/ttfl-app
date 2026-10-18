import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { captureDuPick, chargerCaptures, type Capture } from "@/lib/captures";
import { CaptureVignette } from "@/components/CaptureVignette";

const cap = (over: Partial<Capture> = {}): Capture => ({
  compte: "02",
  pick_date: "2026-10-20",
  joueur: "Shai Gilgeous-Alexander",
  capture_le: "2026-10-18T15:46:39Z",
  url: "https://exemple.test/signee",
  ...over,
});

describe("captureDuPick", () => {
  it("renvoie la capture seulement si elle montre bien ce joueur (accents et casse ignorés)", () => {
    const l = [cap()];
    expect(captureDuPick(l, "02", "2026-10-20", "shai gilgeous-alexander")?.url).toBe("https://exemple.test/signee");
    expect(captureDuPick(l, "02", "2026-10-20", "Victor Wembanyama")).toBeNull();
    expect(captureDuPick(l, "13", "2026-10-20", "Shai Gilgeous-Alexander")).toBeNull();
    expect(captureDuPick(l, "02", "2026-10-21", "Shai Gilgeous-Alexander")).toBeNull();
    expect(captureDuPick(undefined, "02", "2026-10-20", "X")).toBeNull();
    expect(captureDuPick(l, "02", "2026-10-20", null)).toBeNull();
  });
});

describe("chargerCaptures", () => {
  const faux = (lignes: unknown, signees: unknown, erreur: unknown = null) => ({
    from: () => ({ select: () => ({ eq: async () => ({ data: lignes, error: erreur }) }) }),
    storage: { from: () => ({ createSignedUrls: async () => ({ data: signees, error: null }) }) },
  });

  it("associe chaque ligne à son adresse signée", async () => {
    const lignes = [{ compte: "02", pick_date: "2026-10-20", joueur: "A B", capture_le: "2026-10-18T10:00:00Z", chemin: "02/2026-10-20.png" }];
    const r = await chargerCaptures(faux(lignes, [{ path: "02/2026-10-20.png", signedUrl: "https://s/x" }]));
    expect(r).toEqual([{ compte: "02", pick_date: "2026-10-20", joueur: "A B", capture_le: "2026-10-18T10:00:00Z", url: "https://s/x" }]);
  });

  it("ne bloque jamais l'écran : erreur, table vide ou client incomplet → []", async () => {
    expect(await chargerCaptures(faux([], []))).toEqual([]);
    expect(await chargerCaptures(faux(null, null, { message: "table absente" }))).toEqual([]);
    expect(await chargerCaptures({})).toEqual([]);
  });

  it("ignore une ligne sans adresse signée (fichier déjà supprimé)", async () => {
    const lignes = [{ compte: "02", pick_date: "2026-10-20", joueur: "A B", capture_le: "2026-10-18T10:00:00Z", chemin: "02/2026-10-20.png" }];
    expect(await chargerCaptures(faux(lignes, []))).toEqual([]);
  });
});

describe("CaptureVignette", () => {
  it("déplie l'image au clic et la masque ensuite", () => {
    render(<CaptureVignette capture={cap()} />);
    expect(screen.queryByRole("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Voir la capture du site/ }));
    expect(screen.getByRole("img", { name: /Shai Gilgeous-Alexander/ })).toHaveAttribute("src", "https://exemple.test/signee");
    fireEvent.click(screen.getByRole("button", { name: /Masquer la capture/ }));
    expect(screen.queryByRole("img")).toBeNull();
  });
});

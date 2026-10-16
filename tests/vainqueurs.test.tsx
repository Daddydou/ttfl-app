import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { bilanSoiree, choixEffectif, commence, parSoiree, pourcent, probabilite, type ChoixVainqueur, type MatchVainqueur } from "@/lib/vainqueurs";

const refresh = vi.fn();
const choisir = vi.fn();
const revenir = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/actions", () => ({
  choisirVainqueur: (...a: unknown[]) => choisir(...a),
  revenirAuFavori: (...a: unknown[]) => revenir(...a),
}));

const { VainqueursListe } = await import("@/components/VainqueursListe");

const MAINTENANT = Date.parse("2026-10-21T18:00:00Z");

function match(id: string, extra: Partial<MatchVainqueur> = {}): MatchVainqueur {
  return {
    event_id: id, game_date: "2026-10-21", commence_time: "2026-10-21T23:30:00Z", equipe_dom: "Boston Celtics",
    equipe_ext: "New York Knicks", abbr_dom: "BOS", abbr_ext: "NYK", prob_dom: 0.64, cote_dom: 1.5, cote_ext: 2.7,
    nb_books: 6, favori: "dom", serre: false, releve_le: "2026-10-21T14:00:00Z", resultat: null, ...extra,
  };
}

beforeEach(() => {
  refresh.mockReset();
  choisir.mockReset();
  revenir.mockReset();
});

describe("lib/vainqueurs", () => {
  it("probabilités, pourcentage et choix effectif", () => {
    const m = match("a");
    expect(probabilite(m, "dom")).toBe(0.64);
    expect(probabilite(m, "ext")).toBeCloseTo(0.36);
    expect(probabilite(match("b", { prob_dom: null }), "dom")).toBeNull();
    expect(pourcent(0.644)).toBe("64 %");
    expect(pourcent(null)).toBe("—");
    expect(choixEffectif(m, undefined)).toBe("dom");
    expect(choixEffectif(m, { event_id: "a", choix: "ext", source: "manuel" })).toBe("ext");
  });

  it("un match commencé est fermé", () => {
    expect(commence(match("a"), MAINTENANT)).toBe(false);
    expect(commence(match("a", { commence_time: "2026-10-21T17:00:00Z" }), MAINTENANT)).toBe(true);
  });

  it("regroupe par soirée dans l'ordre des coups d'envoi", () => {
    const s = parSoiree([
      match("c", { game_date: "2026-10-22", commence_time: "2026-10-22T23:00:00Z" }),
      match("b", { commence_time: "2026-10-21T23:30:00Z" }),
      match("a", { commence_time: "2026-10-21T23:00:00Z" }),
    ]);
    expect(s.map((x) => [x.date, x.matchs.map((m) => m.event_id)])).toEqual([["2026-10-21", ["a", "b"]], ["2026-10-22", ["c"]]]);
  });

  it("bilan de soirée : serrés, manuels et bons choix", () => {
    const choix = new Map<string, ChoixVainqueur>([["b", { event_id: "b", choix: "ext", source: "manuel" }]]);
    const b = bilanSoiree([match("a", { resultat: "dom" }), match("b", { serre: true, resultat: "dom" }), match("c")], choix);
    expect(b).toEqual({ nbMatchs: 3, nbSerres: 1, nbManuels: 1, nbJuges: 2, nbBons: 1 });
  });
});

describe("Onglet Vainqueurs", () => {
  it("sans match : explique comment forcer un relevé", () => {
    render(<VainqueursListe matchs={[]} choix={[]} maintenantMs={MAINTENANT} />);
    expect(screen.getByText("Aucun match relevé pour l'instant.")).toBeInTheDocument();
  });

  it("le favori est déjà choisi, avec sa probabilité", () => {
    render(<VainqueursListe matchs={[match("a")]} choix={[{ event_id: "a", choix: "dom", source: "auto" }]} maintenantMs={MAINTENANT} />);
    const celtics = screen.getByRole("button", { name: /Boston Celtics/ });
    const knicks = screen.getByRole("button", { name: /New York Knicks/ });
    expect(celtics).toHaveAttribute("aria-pressed", "true");
    expect(knicks).toHaveAttribute("aria-pressed", "false");
    expect(celtics).toHaveTextContent("64 %");
    expect(knicks).toHaveTextContent("36 %");
  });

  it("sans choix enregistré, le favori proposé est affiché comme choisi", () => {
    render(<VainqueursListe matchs={[match("a", { favori: "ext", prob_dom: 0.4 })]} choix={[]} maintenantMs={MAINTENANT} />);
    expect(screen.getByRole("button", { name: /New York Knicks/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("changer d'équipe enregistre un choix manuel puis rafraîchit", async () => {
    choisir.mockResolvedValue({ ok: true });
    render(<VainqueursListe matchs={[match("a")]} choix={[]} maintenantMs={MAINTENANT} />);
    fireEvent.click(screen.getByRole("button", { name: /New York Knicks/ }));
    await waitFor(() => expect(choisir).toHaveBeenCalledWith("a", "ext"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("cliquer sur l'équipe déjà choisie ne fait rien", () => {
    render(<VainqueursListe matchs={[match("a")]} choix={[]} maintenantMs={MAINTENANT} />);
    fireEvent.click(screen.getByRole("button", { name: /Boston Celtics/ }));
    expect(choisir).not.toHaveBeenCalled();
  });

  it("match commencé : boutons désactivés", () => {
    render(<VainqueursListe matchs={[match("a", { commence_time: "2026-10-21T17:00:00Z" })]} choix={[]} maintenantMs={MAINTENANT} />);
    expect(screen.getByRole("button", { name: /New York Knicks/ })).toBeDisabled();
    expect(screen.getByText(/commencé/)).toBeInTheDocument();
  });

  it("choix manuel différent du favori : badge et retour au favori", async () => {
    revenir.mockResolvedValue({ ok: true });
    render(<VainqueursListe matchs={[match("a", { serre: true })]} choix={[{ event_id: "a", choix: "ext", source: "manuel" }]} maintenantMs={MAINTENANT} />);
    expect(screen.getByText("manuel")).toBeInTheDocument();
    expect(screen.getByText("serré")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revenir au favori (Boston Celtics)" }));
    await waitFor(() => expect(revenir).toHaveBeenCalledWith("a"));
  });

  it("une erreur du serveur est affichée sans rafraîchir", async () => {
    choisir.mockResolvedValue({ ok: false, error: "Le match a commencé : le pronostic est fermé." });
    render(<VainqueursListe matchs={[match("a")]} choix={[]} maintenantMs={MAINTENANT} />);
    fireEvent.click(screen.getByRole("button", { name: /New York Knicks/ }));
    expect(await screen.findByText(/pronostic est fermé/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("match terminé : bon ou raté selon le choix", () => {
    render(<VainqueursListe matchs={[match("a", { resultat: "dom" }), match("b", { resultat: "ext", commence_time: "2026-10-21T10:00:00Z" })]}
      choix={[]} maintenantMs={MAINTENANT} />);
    expect(screen.getByText("bon")).toBeInTheDocument();
    expect(screen.getByText("raté")).toBeInTheDocument();
  });
});

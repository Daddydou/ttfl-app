import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { bilanSoiree, etatKt, type ChoixVainqueur, type MatchVainqueur, type PronoKt } from "@/lib/vainqueurs";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/actions", () => ({ choisirVainqueur: vi.fn(), revenirAuFavori: vi.fn() }));

const { VainqueursListe } = await import("@/components/VainqueursListe");

const MAINTENANT = Date.parse("2026-10-21T18:00:00Z");

function match(id: string, extra: Partial<MatchVainqueur> = {}): MatchVainqueur {
  return {
    event_id: id, game_date: "2026-10-21", commence_time: "2026-10-21T23:30:00Z", equipe_dom: "Boston Celtics",
    equipe_ext: "New York Knicks", abbr_dom: "BOS", abbr_ext: "NYK", prob_dom: 0.64, cote_dom: 1.5, cote_ext: 2.7,
    nb_books: 6, favori: "dom", serre: false, releve_le: "2026-10-21T14:00:00Z", resultat: null, ...extra,
  };
}

const prono = (id: string, cote: "dom" | "ext" | null): PronoKt => ({ event_id: id, cote, statut: "a_venir", maj_le: null });

describe("pronos chez Thomas", () => {
  it("compare le prono de Thomas à notre choix", () => {
    expect(etatKt("dom", prono("a", "dom"))).toBe("identique");
    expect(etatKt("dom", prono("a", "ext"))).toBe("different");
    expect(etatKt("dom", prono("a", null))).toBe("vide");
    expect(etatKt("dom", undefined)).toBe("inconnu");
    expect(etatKt(null, prono("a", "dom"))).toBe("different");
  });

  it("le bilan de la soirée compte les pronos posés chez Thomas", () => {
    const ms = [match("a"), match("b"), match("c")];
    const kt = new Map([["a", prono("a", "dom")], ["b", prono("b", null)]]);
    expect(bilanSoiree(ms, new Map<string, ChoixVainqueur>(), kt).nbChezThomas).toBe(1);
    expect(bilanSoiree(ms, new Map<string, ChoixVainqueur>()).nbChezThomas).toBe(0);
  });

  it("affiche validé / différent / rien de posé, et rien tant que le PC n'a pas relu", () => {
    render(
      <VainqueursListe
        matchs={[match("a"), match("b"), match("c"), match("d")]}
        choix={[]}
        kt={[prono("a", "dom"), prono("b", "ext"), prono("c", null)]}
        maintenantMs={MAINTENANT}
      />,
    );
    expect(screen.getByText(/Validé chez Thomas : Boston Celtics/)).toBeInTheDocument();
    expect(screen.getByText(/Chez Thomas : New York Knicks \(différent de ton choix : Boston Celtics\)/)).toBeInTheDocument();
    expect(screen.getByText(/Rien de posé chez Thomas/)).toBeInTheDocument();
    expect(screen.getByText(/2 validés chez Thomas/)).toBeInTheDocument();
  });

  it("sans données KT (table absente), la page s'affiche comme avant", () => {
    render(<VainqueursListe matchs={[match("a")]} choix={[]} maintenantMs={MAINTENANT} />);
    expect(screen.queryByText(/^✓ Validé|^Rien de posé|^Chez Thomas :/)).toBeNull();
  });
});

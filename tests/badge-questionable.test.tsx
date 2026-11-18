// @vitest-environment jsdom
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { BadgeQuestionable, QuestionablesProvider, PastilleVue } from "@/components/BadgeQuestionable";
import { cleCompacte, cleQuestionable, questionablesDepuis } from "@/lib/questionables";

describe("lib/questionables", () => {
  it("la clé ignore accents, ponctuation et majuscules (comme le moteur)", () => {
    expect(cleCompacte("Nikola Jokić")).toBe("nikolajokic");
    expect(cleCompacte("P.J. Washington Jr.")).toBe("pjwashingtonjr");
    expect(cleQuestionable("2026-11-18", "Luka Dončić")).toBe("2026-11-18|lukadoncic");
  });

  it("garde le DERNIER statut de chaque joueur et soirée, seulement Questionable", () => {
    const cles = questionablesDepuis([
      { game_date: "2026-11-18", joueur_norm: "alphajoueur", statut: "Questionable" },
      { game_date: "2026-11-18", joueur_norm: "betajoueur", statut: "Questionable" },
      { game_date: "2026-11-18", joueur_norm: "betajoueur", statut: "Out" }, // devenu Out
      { game_date: "2026-11-18", joueur_norm: "gammajoueur", statut: "Doubtful" },
      { game_date: "2026-11-19", joueur_norm: "alphajoueur", statut: "Aucun" }, // guéri
      { game_date: "2026-11-19", joueur_norm: "deltajoueur", statut: "Questionable" },
    ]);
    expect(cles.sort()).toEqual(["2026-11-18|alphajoueur", "2026-11-19|deltajoueur"]);
  });
});

describe("BadgeQuestionable", () => {
  const cles = [cleQuestionable("2026-11-18", "Joueur Alpha")];

  async function rendre(joueur: string | null, date: string | null, liste: string[] = cles) {
    const promesse = Promise.resolve(liste);
    let rendu!: ReturnType<typeof render>;
    await act(async () => {
      rendu = render(
        <QuestionablesProvider promesse={promesse}>
          <Suspense fallback={null}>
            <BadgeQuestionable joueur={joueur} date={date} />
          </Suspense>
        </QuestionablesProvider>,
      );
      await promesse;
    });
    return rendu;
  }

  it("affiche la pastille Q pour un joueur Questionable ce soir-là", async () => {
    const { container } = await rendre("Joueur Alpha", "2026-11-18");
    expect(container.querySelector("[title*=Questionable]")).not.toBeNull();
  });

  it("rien pour un autre joueur, une autre soirée ou un pick vide", async () => {
    const a = await rendre("Joueur Beta", "2026-11-18");
    const b = await rendre("Joueur Alpha", "2026-11-19");
    const c = await rendre(null, "2026-11-18");
    expect(a.container.textContent).toBe("");
    expect(b.container.textContent).toBe("");
    expect(c.container.textContent).toBe("");
  });

  it("sans fournisseur : aucune pastille, aucune erreur", () => {
    const { container } = render(<BadgeQuestionable joueur="Joueur Alpha" date="2026-11-18" />);
    expect(container.textContent).toBe("");
  });

  it("la vue seule est lisible par un lecteur d'écran", () => {
    const { container } = render(<PastilleVue />);
    expect(container.textContent).toContain("Questionable");
  });
});
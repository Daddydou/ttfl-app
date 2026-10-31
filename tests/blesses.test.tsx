import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  blessesDuMatch,
  blessesParMatch,
  blessesSansEquipe,
  comptesDuBlesse,
  etiquetteCompte,
  indexerPicks,
  libelleStatut,
  trierBlesses,
  type Blesse,
  type MatchSoiree,
} from "@/lib/blesses";
import type { MatchVainqueur } from "@/lib/vainqueurs";
import { BlessesMatch, BlessesSansEquipe } from "@/components/BlessesMatch";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/actions", () => ({ choisirVainqueur: vi.fn(), revenirAuFavori: vi.fn() }));

const { VainqueursListe } = await import("@/components/VainqueursListe");

const MAINTENANT = Date.parse("2026-10-30T18:00:00Z");

function match(id: string, ext: string, dom: string, commence = "2026-10-30T23:40:00Z", date = "2026-10-30"): MatchSoiree {
  return {
    event_id: id, game_date: date, commence_time: commence, equipe_ext: `Equipe ${ext}`, equipe_dom: `Equipe ${dom}`,
    abbr_ext: ext, abbr_dom: dom,
  };
}

function matchVainqueur(m: MatchSoiree): MatchVainqueur {
  return {
    ...m, prob_dom: 0.6, cote_dom: 1.6, cote_ext: 2.4, nb_books: 5, favori: "dom", serre: false,
    releve_le: "2026-10-30T14:00:00Z", resultat: null,
  };
}

function blesse(joueur: string, abbr: string | null, statut: "Out" | "Doubtful", extra: Partial<Blesse> = {}): Blesse {
  return {
    game_date: "2026-10-30", joueur, joueur_norm: joueur.toLowerCase().replace(/\W/g, ""), equipe_abbr: abbr, equipe: null,
    statut, statut_brut: statut, motif: null, retour_prevu: null, source: "nba", maj_le: "2026-10-30T17:30:00Z", ...extra,
  };
}

const MATCHS = [match("m2", "LAL", "GSW", "2026-10-31T02:10:00Z"), match("m1", "CHI", "BOS")];
const BLESSES = [
  blesse("Gui Santos", "GSW", "Doubtful", { motif: "Left Knee — Tendinitis" }),
  blesse("Jimmy Butler III", "GSW", "Out", { motif: "Right Knee — Surgery", retour_prevu: "2026-12-01" }),
  blesse("Devin Carter", "BOS", "Out"),
  blesse("Quelqu'un d'ailleurs", "MIA", "Out"),
  blesse("Bradley Beal", null, "Out"),
];

describe("lib/blesses", () => {
  it("regroupe par match dans l'ordre des coups d'envoi, Out avant Doubtful", () => {
    const pm = blessesParMatch(MATCHS, BLESSES);
    expect(pm.map((m) => m.match.event_id)).toEqual(["m1", "m2"]);
    const gsw = pm[1].dom;
    expect(gsw.joueurs.map((j) => j.joueur)).toEqual(["Jimmy Butler III", "Gui Santos"]);
    expect(pm[1].nbOut).toBe(1);
    expect(pm[1].nbDoubtful).toBe(1);
    expect(pm[0].dom.joueurs).toHaveLength(1);
    expect(pm[0].ext.joueurs).toHaveLength(0);
  });

  it("n'affiche pas les blessés d'une équipe qui ne joue pas, mais garde ceux sans équipe à part", () => {
    const pm = blessesParMatch(MATCHS, BLESSES);
    const tous = pm.flatMap((m) => [...m.ext.joueurs, ...m.dom.joueurs]).map((j) => j.joueur);
    expect(tous).not.toContain("Quelqu'un d'ailleurs");
    expect(blessesSansEquipe(BLESSES).map((b) => b.joueur)).toEqual(["Bradley Beal"]);
  });

  it("libelle le statut et trie Out avant Doubtful", () => {
    expect(libelleStatut(blesse("A", "BOS", "Doubtful", { statut_brut: "Day-To-Day", source: "espn" }))).toBe("Day-To-Day");
    expect(libelleStatut(blesse("A", "BOS", "Doubtful"))).toBe("Doubtful");
    expect(trierBlesses([blesse("B", "X", "Doubtful"), blesse("A", "X", "Out")]).map((b) => b.joueur)).toEqual(["A", "B"]);
  });

  it("blessesDuMatch : seulement la date du match ; null s'il n'y a aucun rapport pour cette soirée", () => {
    const m = match("m1", "CHI", "BOS");
    expect(blessesDuMatch(m, BLESSES)?.dom.joueurs.map((j) => j.joueur)).toEqual(["Devin Carter"]);
    // Un rapport d'une autre soirée ne compte pas : pas de faux « aucun blessé ».
    expect(blessesDuMatch(match("m9", "CHI", "BOS", "2026-11-04T00:00:00Z", "2026-11-03"), BLESSES)).toBeNull();
    expect(blessesDuMatch(m, [])).toBeNull();
    // Rapport lu mais personne de blessé dans ce match : on montre « aucun » (information utile).
    const autre = blessesDuMatch(match("m3", "DEN", "PHX"), BLESSES);
    expect(autre).not.toBeNull();
    expect(autre!.nbOut + autre!.nbDoubtful).toBe(0);
  });
});

describe("BlessesMatch", () => {
  it("une liste déroulante fermée avec les compteurs et les blessés des deux équipes", () => {
    const html = renderToStaticMarkup(<BlessesMatch m={blessesDuMatch(MATCHS[0], BLESSES)} />);
    expect((html.match(/<details/g) ?? []).length).toBe(1);
    expect(html).not.toContain("<details open");
    expect(html).toContain("Blessés");
    expect(html).toContain("1 Out");
    expect(html).toContain("1 Doubtful");
    expect(html).toContain("Jimmy Butler III");
    expect(html).toContain("Right Knee — Surgery");
    expect(html).toContain("Aucun blessé signalé"); // LAL n'a personne
  });

  it("rien du tout sans rapport pour la soirée", () => {
    expect(renderToStaticMarkup(<BlessesMatch m={null} />)).toBe("");
  });

  it("équipe non identifiée : liste à part, rien de caché", () => {
    const html = renderToStaticMarkup(<BlessesSansEquipe blesses={blessesSansEquipe(BLESSES)} />);
    expect(html).toContain("Blessés d&#x27;équipe non identifiée (1)");
    expect(html).toContain("Bradley Beal");
    expect(renderToStaticMarkup(<BlessesSansEquipe blesses={[]} />)).toBe("");
  });
});

describe("page Vainqueurs : les blessés sont dans chaque match", () => {
  it("chaque match a sa liste déroulante Blessés, sans sous-onglet", () => {
    const html = renderToStaticMarkup(
      <VainqueursListe
        matchs={[matchVainqueur(MATCHS[1]), matchVainqueur(MATCHS[0])]}
        choix={[]}
        blesses={BLESSES}
        maintenantMs={MAINTENANT}
      />,
    );
    expect((html.match(/<summary[^>]*>[^<]*<span>Blessés<\/span>/g) ?? []).length).toBe(2);
    expect(html).toContain("Devin Carter");
    expect(html).toContain("Jimmy Butler III");
    expect(html).toContain("Blessés d&#x27;équipe non identifiée (1)");
    expect(html).not.toContain("vue=blesses");
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain("Questionable");
  });

  it("sans table ni rapport : la page des matchs reste identique, sans aucune liste Blessés", () => {
    const html = renderToStaticMarkup(
      <VainqueursListe matchs={[matchVainqueur(MATCHS[1])]} choix={[]} blesses={[]} maintenantMs={MAINTENANT} />,
    );
    expect(html).not.toContain("<span>Blessés</span>");
    expect(html).not.toContain("Seuls les Out");
  });

  it("une soirée sans rapport (dans quelques jours) n'affiche pas de faux « aucun blessé »", () => {
    const lointain = matchVainqueur(match("m8", "CHI", "BOS", "2026-11-04T00:00:00Z", "2026-11-03"));
    const html = renderToStaticMarkup(
      <VainqueursListe matchs={[lointain]} choix={[]} blesses={BLESSES} maintenantMs={MAINTENANT} />,
    );
    expect(html).not.toContain("<span>Blessés</span>");
  });
});

describe("picks de mes comptes sur les blessés (C1, C2...)", () => {
  const PICKS = indexerPicks([
    { pick_date: "2026-10-30", compte: "03", player: "Devin Carter" },
    { pick_date: "2026-10-30", compte: "01", player: "Devin Carter" },
    { pick_date: "2026-10-30", compte: "01", player: "Devin Carter" }, // doublon : une seule étiquette
    { pick_date: "2026-10-30", compte: "13", player: "Jimmy Butler" }, // Jr./III : nom normalisé tolérant
    { pick_date: "2026-10-31", compte: "05", player: "Gui Santos" }, // autre soirée : ne compte pas
  ]);

  it("étiquette C1 pour le compte 01, C13 pour le 13", () => {
    expect(etiquetteCompte("01")).toBe("C1");
    expect(etiquetteCompte("13")).toBe("C13");
  });

  it("comptes triés, sans doublon, seulement pour la soirée du match", () => {
    const carter = BLESSES.find((b) => b.joueur === "Devin Carter")!;
    expect(comptesDuBlesse(carter, PICKS)).toEqual(["01", "03"]);
    expect(comptesDuBlesse(BLESSES.find((b) => b.joueur === "Jimmy Butler III")!, PICKS)).toEqual(["13"]);
    expect(comptesDuBlesse(BLESSES.find((b) => b.joueur === "Gui Santos")!, PICKS)).toEqual([]);
    expect(comptesDuBlesse(carter, {})).toEqual([]);
  });

  it("la liste déroulante montre C1 et C3 sur le blessé, rien sur les autres", () => {
    const html = renderToStaticMarkup(<BlessesMatch m={blessesDuMatch(MATCHS[1], BLESSES)} picks={PICKS} />);
    expect(html).toContain(">C1<");
    expect(html).toContain(">C3<");
    expect(html).not.toContain(">C13<"); // C13 a Butler (GSW), pas Carter (BOS)
    const sans = renderToStaticMarkup(<BlessesMatch m={blessesDuMatch(MATCHS[1], BLESSES)} />);
    expect(sans).not.toContain(">C1<");
  });

  it("page Vainqueurs : étiquettes + légende seulement s'il y a des picks sur des blessés", () => {
    const avec = renderToStaticMarkup(
      <VainqueursListe matchs={[matchVainqueur(MATCHS[1])]} choix={[]} blesses={BLESSES} picks={PICKS} maintenantMs={MAINTENANT} />,
    );
    expect(avec).toContain(">C3<");
    expect(avec).toContain("les comptes qui ont ce joueur en pick");
    const sans = renderToStaticMarkup(
      <VainqueursListe matchs={[matchVainqueur(MATCHS[1])]} choix={[]} blesses={BLESSES} maintenantMs={MAINTENANT} />,
    );
    expect(sans).not.toContain("les comptes qui ont ce joueur en pick");
  });

  it("pick secret du compte 02 : une fois ses lignes retirées par masquerLignes, aucune étiquette C2", async () => {
    const { masquerLignes, ETAT_ILLISIBLE } = await import("@/lib/secret");
    const lignes = [
      { pick_date: "2026-10-30", compte: "02", player: "Devin Carter" },
      { pick_date: "2026-10-30", compte: "04", player: "Devin Carter" },
    ];
    // Illisible = tout secret (fail-closed) ; même date que « aujourd'hui » : le 02 est retiré
    const visibles = masquerLignes(lignes, ETAT_ILLISIBLE, "2026-10-30", Date.parse("2026-10-30T18:00:00Z"));
    const html = renderToStaticMarkup(
      <BlessesMatch m={blessesDuMatch(MATCHS[1], BLESSES)} picks={indexerPicks(visibles)} />,
    );
    expect(html).toContain(">C4<");
    expect(html).not.toContain(">C2<");
  });
});

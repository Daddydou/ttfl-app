import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  blessesParMatch,
  blessesSansEquipe,
  dateBlessesValide,
  libelleStatut,
  resumeBlesses,
  trierBlesses,
  type Blesse,
  type MatchSoiree,
} from "@/lib/blesses";
import { BlessesListe, DatesBlesses, VainqueursNav } from "@/components/BlessesListe";

const MAINTENANT = Date.parse("2026-10-30T18:00:00Z");

function match(id: string, ext: string, dom: string, commence = "2026-10-30T23:40:00Z"): MatchSoiree {
  return {
    event_id: id, game_date: "2026-10-30", commence_time: commence, equipe_ext: `Equipe ${ext}`, equipe_dom: `Equipe ${dom}`,
    abbr_ext: ext, abbr_dom: dom,
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

  it("résume et libelle le statut", () => {
    expect(resumeBlesses(blessesParMatch(MATCHS, BLESSES))).toEqual({ nbOut: 2, nbDoubtful: 1, nbEquipesTouchees: 2 });
    expect(libelleStatut(blesse("A", "BOS", "Doubtful", { statut_brut: "Day-To-Day", source: "espn" }))).toBe("Day-To-Day");
    expect(libelleStatut(blesse("A", "BOS", "Doubtful"))).toBe("Doubtful");
    expect(trierBlesses([blesse("B", "X", "Doubtful"), blesse("A", "X", "Out")]).map((b) => b.joueur)).toEqual(["A", "B"]);
  });

  it("n'accepte que ce soir ou demain", () => {
    expect(dateBlessesValide("2026-10-31", "2026-10-30", "2026-10-31")).toBe("2026-10-31");
    expect(dateBlessesValide("2030-01-01", "2026-10-30", "2026-10-31")).toBe("2026-10-30");
    expect(dateBlessesValide(undefined, "2026-10-30", "2026-10-31")).toBe("2026-10-30");
  });
});

describe("BlessesListe", () => {
  it("une liste déroulante fermée par match, avec les compteurs et les blessés", () => {
    const html = renderToStaticMarkup(
      <BlessesListe date="2026-10-30" matchs={MATCHS} blesses={BLESSES} maintenantMs={MAINTENANT} />,
    );
    expect((html.match(/<details/g) ?? []).length).toBe(3); // 2 matchs + « équipe non identifiée »
    expect(html).not.toContain("<details open");
    expect(html).toContain("CHI");
    expect(html).toContain("1 Out");
    expect(html).toContain("1 Doubtful");
    expect(html).toContain("Jimmy Butler III");
    expect(html).toContain("Right Knee — Surgery");
    expect(html).toContain("Équipe non identifiée (1)");
    expect(html).toContain("Aucun blessé signalé");
    expect(html).toContain("Source : rapport officiel de la NBA");
  });

  it("sans rapport : message clair, pas d'erreur", () => {
    const html = renderToStaticMarkup(<BlessesListe date="2026-10-30" matchs={MATCHS} blesses={[]} maintenantMs={MAINTENANT} />);
    expect(html).toContain("Aucun rapport de blessures lu");
  });

  it("sans match : message dédié", () => {
    const html = renderToStaticMarkup(<BlessesListe date="2026-10-30" matchs={[]} blesses={[]} maintenantMs={MAINTENANT} />);
    expect(html).toContain("Aucun match relevé");
  });

  it("source ESPN annoncée", () => {
    const html = renderToStaticMarkup(
      <BlessesListe
        date="2026-10-31"
        matchs={MATCHS}
        blesses={[blesse("Gui Santos", "GSW", "Doubtful", { source: "espn", statut_brut: "Day-To-Day" })]}
        maintenantMs={MAINTENANT}
      />,
    );
    expect(html).toContain("Source : ESPN");
    expect(html).toContain("Day-To-Day");
  });
});

describe("navigation Vainqueurs", () => {
  it("deux sous-onglets et deux soirées", () => {
    const nav = renderToStaticMarkup(<VainqueursNav vue="blesses" />);
    expect(nav).toContain('href="/vainqueurs"');
    expect(nav).toContain("vue=blesses");
    const dates = renderToStaticMarkup(<DatesBlesses courant="2026-10-31" aujourdhui="2026-10-30" demain="2026-10-31" />);
    expect(dates).toContain("Ce soir");
    expect(dates).toContain("Demain");
    expect(dates).toContain("date=2026-10-31");
  });
});

import { describe, it, expect } from "vitest";
import { parCompte, parSoiree, syntheseEquipe, cumulEquipe, victoiresParCompte, parJoueur, type ScorePick } from "@/lib/stats-equipe";
import { series, formeRecente } from "@/lib/stats-mes-picks";
import { detailFormules, bilanX2 } from "@/lib/stats-strategie";
import { resumeLigue, progression, picksPopulaires } from "@/lib/stats-adversaires";
import { parDefense } from "@/lib/stats-nba";
import { bilanVainqueurs, parTranche } from "@/lib/stats-vainqueurs";
import { bilanSysteme, estEchec, type Passage } from "@/lib/stats-systeme";
import { lirePages } from "@/lib/stats-donnees";
import { fmt, fmtPourcent, moyenne, pourcent } from "@/lib/stats-outils";
import type { MatchVainqueur, ChoixVainqueur } from "@/lib/vainqueurs";
import type { TtflSuivi, TtflProjection } from "@/lib/types";
import type { LigneX2 } from "@/lib/x2";

const p = (compte: string, pick_date: string, player: string, score: number | null): ScorePick => ({ compte, pick_date, player, score });

const PICKS: ScorePick[] = [
  p("01", "2026-11-01", "Jokic", 50),
  p("02", "2026-11-01", "Doncic", 10),
  p("01", "2026-11-02", "Edwards", 0),
  p("02", "2026-11-02", "Jokic", 40),
  p("01", "2026-11-03", "Pas joué", null), // sans score : ignoré
];

describe("stats-outils", () => {
  it("moyenne, pourcent et formats tolèrent le vide", () => {
    expect(moyenne([])).toBeNull();
    expect(moyenne([2, 4])).toBe(3);
    expect(pourcent(1, 0)).toBeNull();
    expect(pourcent(1, 4)).toBe(25);
    expect(fmt(null)).toBe("—");
    expect(fmtPourcent(null)).toBe("—");
  });
});

describe("stats-equipe", () => {
  it("ne compte que les picks notés", () => {
    const s = syntheseEquipe(PICKS);
    expect(s.nPicks).toBe(4);
    expect(s.total).toBe(100);
    expect(s.nSoirees).toBe(2);
    expect(s.nComptes).toBe(2);
    expect(s.moyennePick).toBe(25);
  });

  it("parCompte : total, moyenne, zéros et bons soirs (≥ 40)", () => {
    const c = parCompte(PICKS);
    const c01 = c.find((x) => x.compte === "01")!;
    expect(c01.n).toBe(2);
    expect(c01.total).toBe(50);
    expect(c01.moyenne).toBe(25);
    expect(c01.zeros).toBe(1);
    expect(c01.bonsSoirs).toBe(1);
    expect(c.find((x) => x.compte === "02")!.bonsSoirs).toBe(1);
  });

  it("parSoiree, cumul et victoires", () => {
    const soirees = parSoiree(PICKS);
    expect(soirees.map((s) => s.date)).toEqual(["2026-11-01", "2026-11-02"]);
    expect(soirees[0].total).toBe(60);
    const cumul = cumulEquipe(soirees);
    expect(cumul.map((c) => c.cumul)).toEqual([60, 100]);
    const v = victoiresParCompte(PICKS);
    expect(v.find((x) => x.compte === "01")!.victoires).toBe(1);
    expect(v.find((x) => x.compte === "02")!.victoires).toBe(1);
  });

  it("parJoueur regroupe les noms et compte les comptes différents", () => {
    const j = parJoueur(PICKS).find((x) => x.player === "Jokic")!;
    expect(j.n).toBe(2);
    expect(j.comptes).toBe(2);
    expect(j.moyenne).toBe(45);
  });

  it("liste vide : rien ne plante", () => {
    expect(syntheseEquipe([])).toMatchObject({ total: 0, nPicks: 0, moyennePick: null });
    expect(parCompte([])).toEqual([]);
  });
});

describe("stats-mes-picks", () => {
  it("série : picks consécutifs à 30 points ou plus", () => {
    const s = series([p("01", "2026-11-01", "A", 35), p("01", "2026-11-02", "B", 31), p("01", "2026-11-03", "C", 5), p("01", "2026-11-04", "D", 40)]);
    expect(s.meilleure).toBe(2);
    expect(s.enCours).toBe(1);
  });
  it("forme récente comparée à la saison", () => {
    const f = formeRecente([p("01", "2026-11-01", "A", 10), p("01", "2026-11-02", "B", 30)], 1);
    expect(f.recent).toBe(30);
    expect(f.saison).toBe(20);
    expect(f.ecart).toBe(10);
  });
});

describe("stats-strategie", () => {
  it("ne compare que les soirées notées pour TOUTES les formules", () => {
    const d = detailFormules([
      { profil: "prudent", pick_date: "2026-11-01", joueur: "A", projection: 30, score_reel: 20 },
      { profil: "equilibre", pick_date: "2026-11-01", joueur: "B", projection: 32, score_reel: 40 },
      { profil: "prudent", pick_date: "2026-11-02", joueur: "C", projection: 30, score_reel: 10 }, // l'autre formule manque ce soir-là
    ]);
    expect(d.soirees.map((s) => s.date)).toEqual(["2026-11-01"]);
    expect(d.victoires.equilibre).toBe(1);
    expect(d.cumuls.prudent).toEqual([20]);
  });

  it("bilan des x2 : le gain est le score du pick doublé", () => {
    const x2: LigneX2[] = [
      { compte: "01", mois: "2026-11", pick_date: "2026-11-01", player: "Jokic", source: "app", statut: "pose", date_site: null, message: null, rang: null },
      { compte: "03", mois: "2026-11", pick_date: "2026-11-02", player: "Edwards", source: "auto", statut: "voulu", date_site: null, message: null, rang: null },
    ];
    const b = bilanX2(x2, PICKS);
    expect(b.total).toBe(2);
    expect(b.poses).toBe(1);
    expect(b.joues).toBe(1);
    expect(b.pointsGagnes).toBe(50);
  });
});

describe("stats-adversaires", () => {
  const suivi = (id: number, pseudo: string, rang: number | null, points: number | null): TtflSuivi => ({
    users_id: id, pseudo, equipe: null, rang, points, moyenne: null, best_picks: 0, x2: 0, suivi: true, maj_le: "2026-11-01T08:00:00Z",
  });
  it("résumé de la ligue : leader et meilleur rang", () => {
    const l = resumeLigue([suivi(1, "Alpha", 20, 900), suivi(2, "Beta", 5, 800)]);
    expect(l.nSuivis).toBe(2);
    expect(l.leader?.pseudo).toBe("Alpha");
    expect(l.meilleurRang?.pseudo).toBe("Beta");
  });
  it("progression sur la fenêtre", () => {
    const pr = progression(
      [suivi(1, "Alpha", 20, 900)],
      [
        { users_id: 1, jour: "2026-11-01", points: 100, rang: 30 },
        { users_id: 1, jour: "2026-11-03", points: 160, rang: 25 },
      ],
      7,
    );
    expect(pr[0].gagne).toBe(60);
  });
  it("picks populaires", () => {
    const pop = picksPopulaires([
      { users_id: 1, pick_date: "2026-11-01", joueur: "Jokic" },
      { users_id: 2, pick_date: "2026-11-01", joueur: "Jokic" },
      { users_id: 1, pick_date: "2026-11-02", joueur: "Doncic" },
    ]);
    expect(pop[0]).toMatchObject({ joueur: "Jokic", n: 2, adversaires: 2 });
  });
});

describe("stats-nba", () => {
  it("défenses : facteur de match-up moyen par adversaire, le plus permissif d'abord", () => {
    const proj = (opponent: string, matchup: number) => ({ player: "X", opponent, matchup_factor: matchup, projection: 30 }) as unknown as TtflProjection;
    const d = parDefense([proj("LAL", 1.2), proj("LAL", 1.0), proj("BOS", 0.9)]);
    expect(d[0].adversaire).toBe("LAL");
    expect(d[0].matchup).toBeCloseTo(1.1, 5);
    expect(d[1].adversaire).toBe("BOS");
  });
});

describe("stats-vainqueurs", () => {
  const match = (id: string, favori: "dom" | "ext" | null, resultat: "dom" | "ext" | null, prob: number): MatchVainqueur => ({
    event_id: id, game_date: "2026-11-01", commence_time: "2026-11-02T00:00:00Z", equipe_dom: "A", equipe_ext: "B", abbr_dom: "A", abbr_ext: "B",
    prob_dom: prob, cote_dom: null, cote_ext: null, nb_books: 5, favori, serre: false, releve_le: null, resultat,
  });
  const choix = new Map<string, ChoixVainqueur>([
    ["m1", { event_id: "m1", choix: "dom", source: "auto" }],
    ["m2", { event_id: "m2", choix: "ext", source: "manuel" }],
  ]);
  const matchs = [match("m1", "dom", "dom", 0.75), match("m2", "dom", "ext", 0.65), match("m3", "dom", null, 0.7)];

  it("compte les bons pronos et la fiabilité du favori, sans les matchs non terminés", () => {
    const b = bilanVainqueurs(matchs, choix);
    expect(b.juges).toBe(2);
    expect(b.bons).toBe(2);
    expect(b.favorisJuges).toBe(2);
    expect(b.favorisGagnent).toBe(1);
    expect(b.outsiders).toEqual({ n: 1, bons: 1, taux: 100 });
  });
  it("tranches de probabilité", () => {
    const t = parTranche(matchs);
    expect(t.find((x) => x.label === "70–80 %")).toMatchObject({ n: 1, gagnent: 1 });
    expect(t.find((x) => x.label === "60–70 %")).toMatchObject({ n: 1, gagnent: 0 });
  });
});

describe("stats-systeme", () => {
  const ps: Passage[] = [
    { tache: "soir", mode: "reel", debut_le: "2026-11-06T16:00:00Z", fin_le: "2026-11-06T16:01:00Z", code: 0, echecs: null },
    { tache: "matin", mode: "reel", debut_le: "2026-11-07T08:40:00Z", fin_le: "2026-11-07T08:40:30Z", code: 1, echecs: "classement" },
    { tache: "soir", mode: "reel", debut_le: "2026-11-07T15:00:00Z", fin_le: null, code: null, echecs: null },
  ];
  it("un échec = code non nul ; un passage en cours n'est pas un échec", () => {
    expect(estEchec(ps[0])).toBe(false);
    expect(estEchec(ps[1])).toBe(true);
    expect(estEchec(ps[2])).toBe(false);
  });
  it("bilan global et par tâche", () => {
    const b = bilanSysteme(ps);
    expect(b.passages).toBe(3);
    expect(b.echecs).toBe(1);
    expect(b.tauxReussite).toBeCloseTo(66.67, 1);
    expect(b.parTache.find((t) => t.tache === "soir")).toMatchObject({ passages: 2, echecs: 0 });
    expect(b.echecsRecents[0].tache).toBe("matin");
    expect(b.dernier).toBe("2026-11-07T15:00:00Z");
  });
});

describe("lirePages", () => {
  it("enchaîne les pages de 1000 lignes jusqu'à la dernière page incomplète", async () => {
    const appels: number[] = [];
    const lignes = await lirePages<number>(async (debut) => {
      appels.push(debut);
      return { data: Array.from({ length: debut === 0 ? 1000 : 5 }, (_, i) => debut + i), error: null };
    });
    expect(appels).toEqual([0, 1000]);
    expect(lignes).toHaveLength(1005);
  });
  it("s'arrête sur une erreur sans rien lever", async () => {
    const lignes = await lirePages<number>(async () => ({ data: null, error: { message: "boum" } }));
    expect(lignes).toEqual([]);
  });
});

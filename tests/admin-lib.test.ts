import { describe, it, expect } from "vitest";
import {
  ACTIONS_PC, GROUPES, anneeDebutSaison, etatExecuteur, nettoyerParams, parserImport, planifierCopie,
  planifierEcritures, validerPlage,
} from "@/lib/admin";

const action = (id: string) => ACTIONS_PC.find((a) => a.id === id)!;

describe("catalogue des actions du PC", () => {
  it("les identifiants sont uniques et chaque action appartient à un groupe affiché", () => {
    const ids = ACTIONS_PC.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const groupes = new Set(GROUPES.map((g) => g.id));
    expect(ACTIONS_PC.every((a) => groupes.has(a.groupe))).toBe(true);
  });

  it("les actions qui écrivent sur le site TTFL ou consomment un quota demandent une confirmation", () => {
    for (const id of ["synchro_app", "synchro_complet", "import_cotes"]) expect(action(id).confirmer, id).toBeTruthy();
    expect(action("calendrier").confirmer).toBeUndefined();
  });
});

describe("nettoyerParams — rien de libre n'arrive jusqu'à l'exécuteur", () => {
  it("date : optionnelle, au format AAAA-MM-JJ et réelle", () => {
    expect(nettoyerParams(action("push_soir"), {})).toEqual({ params: {} });
    expect(nettoyerParams(action("push_soir"), { date: "2026-10-20" })).toEqual({ params: { date: "2026-10-20" } });
    expect(nettoyerParams(action("push_soir"), { date: "2026-02-30" })).toHaveProperty("error");
    expect(nettoyerParams(action("push_soir"), { date: "2026-10-20; calc" })).toHaveProperty("error");
    expect(nettoyerParams(action("push_soir"), { date: 20261020 })).toHaveProperty("error");
  });

  it("nuits : entier de 1 à 21", () => {
    expect(nettoyerParams(action("push_avance"), { nuits: 7 })).toEqual({ params: { nuits: 7 } });
    expect(nettoyerParams(action("push_avance"), { nuits: "7" })).toEqual({ params: { nuits: 7 } });
    for (const n of [0, 22, 1.5, "abc", "7; x"]) expect(nettoyerParams(action("push_avance"), { nuits: n }), String(n)).toHaveProperty("error");
  });

  it("une action sans paramètre ignore tout ce qu'on lui passe", () => {
    expect(nettoyerParams(action("benchmarks"), { date: "n'importe quoi", x: 1 })).toEqual({ params: {} });
  });
});

describe("état de l'exécuteur du PC", () => {
  it("en ligne sous 3 min, lent sous 10 min, hors ligne au-delà, inconnu sans battement", () => {
    expect(etatExecuteur(1)).toEqual({ etat: "en_ligne", minutes: 1 });
    expect(etatExecuteur(2)).toEqual({ etat: "en_ligne", minutes: 2 });
    expect(etatExecuteur(3)).toEqual({ etat: "lent", minutes: 3 });
    expect(etatExecuteur(5)).toEqual({ etat: "lent", minutes: 5 });
    expect(etatExecuteur(10)).toEqual({ etat: "hors_ligne", minutes: 10 });
    expect(etatExecuteur(30)).toEqual({ etat: "hors_ligne", minutes: 30 });
    expect(etatExecuteur(null)).toEqual({ etat: "inconnu", minutes: null });
  });
});

describe("parserImport", () => {
  const aujourdhui = "2026-10-10";
  it("accepte plusieurs formats : AAAA-MM-JJ, JJ/MM, JJ/MM/AAAA, séparateurs variés", () => {
    const { lignes, erreurs } = parserImport(
      ["2026-10-21;Nikola Jokic", "22/10 Luka Doncic", "23/10/2026 - Jayson Tatum", "24/10, \"Jalen Brunson\"", "25/10\tAnthony Edwards"].join("\n"),
      aujourdhui,
    );
    expect(erreurs).toEqual([]);
    expect(lignes.map((l) => [l.date, l.player])).toEqual([
      ["2026-10-21", "Nikola Jokic"], ["2026-10-22", "Luka Doncic"], ["2026-10-23", "Jayson Tatum"],
      ["2026-10-24", "Jalen Brunson"], ["2026-10-25", "Anthony Edwards"],
    ]);
  });

  it("année à 4 chiffres lue en entier (jamais « 20 » puis un nom commençant par « 26 »)", () => {
    const { lignes, erreurs } = parserImport("23/10/2026 Jayson Tatum\n24/10/27 Luka Doncic", "2026-10-10");
    expect(erreurs).toEqual([]);
    expect(lignes.map((l) => [l.date, l.player])).toEqual([["2026-10-23", "Jayson Tatum"], ["2027-10-24", "Luka Doncic"]]);
  });

  it("déduit l'année de la saison : octobre-décembre = année de début, janvier-juin = année suivante", () => {
    expect(anneeDebutSaison("2026-10-10")).toBe(2026);
    expect(anneeDebutSaison("2027-02-01")).toBe(2026);
    const { lignes } = parserImport("15/01 A Bb\n20/12 C Dd", "2026-10-10");
    expect(lignes.map((l) => l.date)).toEqual(["2026-12-20", "2027-01-15"]);
  });

  it("ignore lignes vides et commentaires, et signale chaque ligne invalide avec son numéro", () => {
    const { lignes, erreurs } = parserImport(["# mes picks", "", "pas une date", "30/02 Joueur Un", "21/10 X", "21/10 Bon Joueur"].join("\n"), aujourdhui);
    expect(lignes).toHaveLength(1);
    expect(erreurs.map((e) => [e.n, e.raison.split(" ")[0]])).toEqual([[3, "format"], [4, "date"], [5, "nom"]]);
  });

  it("refuse deux picks la même soirée (un seul par soirée et par compte)", () => {
    const { lignes, erreurs } = parserImport("21/10 Nikola Jokic\n21/10 Luka Doncic", aujourdhui);
    expect(lignes).toHaveLength(1);
    expect(erreurs[0]).toMatchObject({ n: 2 });
    expect(erreurs[0].raison).toMatch(/ligne 1/);
  });

  it("trie par date", () => {
    const { lignes } = parserImport("25/10 Aa Bb\n21/10 Cc Dd", aujourdhui);
    expect(lignes.map((l) => l.date)).toEqual(["2026-10-21", "2026-10-25"]);
  });
});

describe("planifierEcritures — cycle de 30 jours vérifié compte par compte avant d'écrire", () => {
  const lignes = [{ date: "2026-10-21", player: "Nikola Jokic" }, { date: "2026-10-25", player: "Luka Doncic" }];

  it("écrit tout sur des comptes sans historique", () => {
    const r = planifierEcritures({ lignes, comptes: ["03", "04"], existants: [] });
    expect(r.ecritures).toHaveLength(4);
    expect(r.problemes).toEqual([]);
  });

  it("refuse, pour CE compte seulement, un joueur déjà pické à ≤ 30 jours (passé ou futur)", () => {
    const existants = [{ pick_date: "2026-10-10", player: "Nikola Jokic", compte: "03" }];
    const r = planifierEcritures({ lignes, comptes: ["03", "04"], existants });
    expect(r.problemes).toEqual([{ compte: "03", date: "2026-10-21", player: "Nikola Jokic", raison: "déjà pické à 30 jours ou moins" }]);
    expect(r.ecritures.filter((e) => e.compte === "04")).toHaveLength(2); // l'autre compte n'est pas touché
    expect(r.ecritures.filter((e) => e.compte === "03")).toHaveLength(1);
  });

  it("deux lignes du MÊME import avec le même joueur à moins de 30 jours : la seconde est refusée", () => {
    const r = planifierEcritures({
      lignes: [{ date: "2026-10-21", player: "Nikola Jokic" }, { date: "2026-11-05", player: "Nikola Jokic" }],
      comptes: ["03"], existants: [],
    });
    expect(r.ecritures).toHaveLength(1);
    expect(r.problemes).toHaveLength(1);
  });

  it("ré-importer le même joueur à la même date REMPLACE : pas de faux conflit avec soi-même", () => {
    const existants = [{ pick_date: "2026-10-21", player: "Nikola Jokic", compte: "03" }];
    const r = planifierEcritures({ lignes: [{ date: "2026-10-21", player: "Nikola Jokic" }], comptes: ["03"], existants });
    expect(r.problemes).toEqual([]);
    expect(r.ecritures).toHaveLength(1);
  });

  it("reconnaît le même joueur malgré accents et suffixes", () => {
    const existants = [{ pick_date: "2026-10-10", player: "Luka Dončić", compte: "03" }];
    const r = planifierEcritures({ lignes: [{ date: "2026-10-21", player: "Luka Doncic" }], comptes: ["03"], existants });
    expect(r.problemes).toHaveLength(1);
  });

  it("copie : les picks du compte source vers d'autres comptes, mêmes règles", () => {
    const source = [{ pick_date: "2026-10-21", player: "Nikola Jokic", compte: "03" }, { pick_date: "2026-10-25", player: "Luka Doncic", compte: "03" }];
    const existants = [{ pick_date: "2026-10-12", player: "Luka Doncic", compte: "05" }];
    const r = planifierCopie({ source, destinations: ["04", "05"], existants });
    expect(r.ecritures).toHaveLength(3);
    expect(r.problemes).toMatchObject([{ compte: "05", player: "Luka Doncic" }]);
  });
});

describe("validerPlage", () => {
  const auj = "2026-10-10";
  it("accepte une plage valide", () => expect(validerPlage("2026-10-20", "2026-11-20", auj)).toBeNull());
  it("refuse une plage inversée, trop longue ou mal formée", () => {
    expect(validerPlage("2026-11-20", "2026-10-20", auj)).toMatch(/précède/);
    expect(validerPlage("2026-01-01", "2027-12-31", auj)).toMatch(/trop longue/);
    expect(validerPlage("20/10/2026", "2026-11-20", auj)).toMatch(/invalides/);
  });
  it("pour une suppression, protège l'historique : jamais de date passée", () => {
    expect(validerPlage("2026-10-09", "2026-10-20", auj, true)).toMatch(/historique/);
    expect(validerPlage("2026-10-10", "2026-10-20", auj, true)).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import {
  filtrer, filtreValide, grouperParCause, masquerJournal, periodeValide, type EntreeJournal,
} from "@/lib/journal";
import { ETAT_ILLISIBLE, type EtatSecret } from "@/lib/secret";

let n = 0;
function e(p: Partial<EntreeJournal>): EntreeJournal {
  n += 1;
  return {
    id: n, le: `2026-10-22T10:${String(n).padStart(2, "0")}:00Z`, categorie: "pick", action: "Action", consequence: null,
    resultat: "ok", origine: "systeme", compte: null, soiree: null, joueur: null, cause_id: null, ...p,
  };
}

const secret: EtatSecret = {
  actif: true, compte: "02", profil: "prudent", lisible: true,
  lignes: {
    "2026-10-23": { soiree: "2026-10-23", cloture: "2026-10-23T20:00:00+00:00", revele_le: null, motif: null },
    "2026-10-22": { soiree: "2026-10-22", cloture: "2026-10-22T22:00:00+00:00", revele_le: "2026-10-22T07:32:00Z", motif: "force" },
  },
};
const AUJ = "2026-10-22";
const MAINT = Date.parse("2026-10-22T16:00:00Z");

describe("filtres du journal", () => {
  const liste = [e({ categorie: "pick" }), e({ categorie: "calcul", resultat: "alerte" }), e({ categorie: "commande", resultat: "echec" }), e({ categorie: "robot" })];
  it("« Problèmes » garde les échecs et les alertes", () => {
    expect(filtrer(liste, "problemes").map((x) => x.categorie)).toEqual(["calcul", "commande"]);
  });
  it("les filtres par thème regroupent les catégories", () => {
    expect(filtrer(liste, "picks")).toHaveLength(1);
    expect(filtrer(liste, "admin")).toHaveLength(1);
    expect(filtrer(liste, "robots")).toHaveLength(1);
    expect(filtrer(liste, "tout")).toHaveLength(4);
  });
  it("valeurs d'adresse inconnues = valeurs par défaut", () => {
    expect(filtreValide("n'importe quoi")).toBe("tout");
    expect(filtreValide(undefined)).toBe("tout");
    expect(periodeValide("7")).toBe(7);
    expect(periodeValide("999")).toBe(1);
  });
});

describe("pick secret dans le journal", () => {
  it("retire les lignes du compte 02 dont la soirée est encore secrète", () => {
    const l = [
      e({ compte: "02", soiree: "2026-10-23", joueur: "X" }),
      e({ compte: "03", soiree: "2026-10-23", joueur: "Y" }),
    ];
    expect(masquerJournal(l, secret, AUJ, MAINT).map((x) => x.compte)).toEqual(["03"]);
  });
  it("garde la soirée révélée (à la main) et la soirée close", () => {
    const l = [e({ compte: "02", soiree: "2026-10-22", joueur: "X" }), e({ compte: "02", soiree: "2026-10-21", joueur: "Z" })];
    expect(masquerJournal(l, secret, AUJ, MAINT)).toHaveLength(2);
    const close = Date.parse("2026-10-24T00:30:00Z");
    expect(masquerJournal([e({ compte: "02", soiree: "2026-10-23", joueur: "X" })], secret, "2026-10-24", close)).toHaveLength(1);
  });
  it("garde les lignes du 02 sans joueur ni soirée (ex. plan recalculé) mais retire celles avec joueur sans soirée", () => {
    const l = [e({ compte: "02", categorie: "plan" }), e({ compte: "02", joueur: "X" })];
    expect(masquerJournal(l, secret, AUJ, MAINT).map((x) => x.categorie)).toEqual(["plan"]);
  });
  it("secret éteint : tout est visible ; lecture impossible : le 02 reste caché", () => {
    const l = [e({ compte: "02", soiree: "2026-10-23", joueur: "X" })];
    expect(masquerJournal(l, { ...secret, actif: false }, AUJ, MAINT)).toHaveLength(1);
    expect(masquerJournal(l, ETAT_ILLISIBLE, AUJ, MAINT)).toHaveLength(0);
  });
});

describe("regroupement demande → conséquences", () => {
  it("range les conséquences sous leur demande, dans l'ordre chronologique", () => {
    const demande = e({ categorie: "commande", action: "Demande" });
    const c1 = e({ categorie: "calcul", cause_id: demande.id });
    const c2 = e({ categorie: "plan", cause_id: demande.id });
    const seule = e({ categorie: "robot" });
    const g = grouperParCause([seule, c2, demande, c1]);
    expect(g).toHaveLength(2);
    const gd = g.find((x) => x.entree.id === demande.id)!;
    expect(gd.consequences.map((x) => x.id)).toEqual([c1.id, c2.id]);
    expect(g[0].entree.id).toBe(seule.id); // la plus récente d'abord
  });
  it("une conséquence dont la demande n'est pas dans la liste reste visible", () => {
    const orpheline = e({ categorie: "calcul", cause_id: 99999 });
    expect(grouperParCause([orpheline])).toEqual([{ entree: orpheline, consequences: [] }]);
  });
});

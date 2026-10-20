import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Faux Supabase : réglage + lignes de clôture, avec erreurs possibles -----------------------------------------
let reglage: { id: number; actif: boolean; compte?: string; profil?: string } | null = { id: 1, actif: true, compte: "02", profil: "prudent" };
let lignesBase: { soiree: string; cloture: string | null; revele_le: string | null; motif: string | null }[] = [];
let erreurReglage: string | null = null;
let erreurLignes: string | null = null;
let exception = false;
const ecritures: { op: string; table: string; valeur?: unknown; options?: unknown; filtres: unknown[][] }[] = [];

function from(table: string) {
  if (exception) throw new Error("réseau coupé");
  const filtres: unknown[][] = [];
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.eq = (...a: unknown[]) => { filtres.push(a); return q; };
  q.gte = () => q;
  q.maybeSingle = async () => (erreurReglage ? { data: null, error: { message: erreurReglage } } : { data: table === "ttfl_secret_reglage" ? reglage : null, error: null });
  q.returns = async () => (erreurLignes ? { data: null, error: { message: erreurLignes } } : { data: lignesBase, error: null });
  q.upsert = async (valeur: unknown, options: unknown) => {
    ecritures.push({ op: "upsert", table, valeur, options, filtres });
    return { error: null };
  };
  q.update = (valeur: unknown) => {
    const u: Record<string, unknown> = {
      eq: async (...a: unknown[]) => {
        ecritures.push({ op: "update", table, valeur, filtres: [a] });
        return { error: null };
      },
    };
    return u;
  };
  return q;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const S = await import("@/lib/secret");
const { revelerSoiree, reglerSecret } = await import("@/app/(app)/secret/actions");

// Mardi 20/10/2026 à 18:10 Paris (12:10 à New York) : la clôture de ce soir est à 21:00 Paris = 19:00 UTC.
const MAINTENANT = Date.parse("2026-10-20T16:10:00Z");
const AUJ = "2026-10-20";

const etat = (p: Partial<import("@/lib/secret").EtatSecret> = {}): import("@/lib/secret").EtatSecret => ({
  actif: true, compte: "02", profil: "prudent", lisible: true, lignes: {}, ...p,
});

beforeEach(() => {
  reglage = { id: 1, actif: true, compte: "02", profil: "prudent" };
  lignesBase = [];
  erreurReglage = null;
  erreurLignes = null;
  exception = false;
  ecritures.length = 0;
});

describe("soireeSecrete", () => {
  it("cache le compte 02 tant que la soirée n'est pas close", () => {
    const e = etat({ lignes: { "2026-10-20": { soiree: "2026-10-20", cloture: "2026-10-20T19:00:00Z", revele_le: null, motif: null } } });
    expect(S.soireeSecrete(e, "02", "2026-10-20", AUJ, MAINTENANT)).toBe(true);
  });

  it("ne cache jamais les autres comptes", () => {
    expect(S.soireeSecrete(etat(), "01", "2026-10-21", AUJ, MAINTENANT)).toBe(false);
    expect(S.soireeSecrete(etat(), "03", "2026-10-21", AUJ, MAINTENANT)).toBe(false);
  });

  it("révèle à la clôture pile et après", () => {
    const e = etat({ lignes: { "2026-10-20": { soiree: "2026-10-20", cloture: "2026-10-20T19:00:00Z", revele_le: null, motif: null } } });
    expect(S.soireeSecrete(e, "02", "2026-10-20", AUJ, Date.parse("2026-10-20T18:59:59Z"))).toBe(true);
    expect(S.soireeSecrete(e, "02", "2026-10-20", AUJ, Date.parse("2026-10-20T19:00:00Z"))).toBe(false);
  });

  it("révèle quand la révélation est forcée", () => {
    const e = etat({ lignes: { "2026-10-22": { soiree: "2026-10-22", cloture: "2026-10-22T20:00:00Z", revele_le: "2026-10-20T16:00:00Z", motif: "force" } } });
    expect(S.soireeSecrete(e, "02", "2026-10-22", AUJ, MAINTENANT)).toBe(false);
  });

  it("ne cache pas les soirées passées", () => {
    expect(S.soireeSecrete(etat(), "02", "2026-10-19", AUJ, MAINTENANT)).toBe(false);
  });

  it("cache une soirée à venir sans heure de clôture connue", () => {
    expect(S.soireeSecrete(etat(), "02", "2026-10-25", AUJ, MAINTENANT)).toBe(true);
  });

  it("interrupteur éteint : rien n'est caché", () => {
    expect(S.soireeSecrete(etat({ actif: false }), "02", "2026-10-21", AUJ, MAINTENANT)).toBe(false);
  });

  it("accepte une date avec heure (timestamp)", () => {
    expect(S.soireeSecrete(etat(), "02", "2026-10-21T00:00:00+00:00", AUJ, MAINTENANT)).toBe(true);
  });
});

describe("masquerLignes / soireesSecretes", () => {
  const picks = [
    { compte: "01", pick_date: "2026-10-21", joueur: "A" },
    { compte: "02", pick_date: "2026-10-21", joueur: "B" },
    { compte: "02", pick_date: "2026-10-19", joueur: "C" },
  ];

  it("retire seulement les lignes du 02 encore secrètes", () => {
    const r = S.masquerLignes(picks, etat(), AUJ, MAINTENANT);
    expect(r.map((l) => l.joueur)).toEqual(["A", "C"]);
  });

  it("garde tout quand le secret est éteint", () => {
    expect(S.masquerLignes(picks, etat({ actif: false }), AUJ, MAINTENANT)).toHaveLength(3);
  });

  it("utilise le champ date demandé", () => {
    const l = [{ compte: "02", jour: "2026-10-21" }, { compte: "02", jour: "2026-10-18" }];
    expect(S.masquerLignes(l, etat(), AUJ, MAINTENANT, "jour")).toEqual([{ compte: "02", jour: "2026-10-18" }]);
  });

  it("liste les soirées secrètes", () => {
    expect(S.soireesSecretes(etat(), ["2026-10-19", "2026-10-20", "2026-10-21"], AUJ, MAINTENANT)).toEqual(["2026-10-20", "2026-10-21"]);
  });
});

describe("libellés", () => {
  it("affiche l'heure de clôture en heure de Paris", () => {
    const e = etat({ lignes: { "2026-10-20": { soiree: "2026-10-20", cloture: "2026-10-20T19:00:00Z", revele_le: null, motif: null } } });
    expect(S.heureCloture(e, "2026-10-20")).toBe("21:00");
    expect(S.libelleSecret(e, "2026-10-20")).toContain("21:00");
  });

  it("sans clôture connue : phrase sans heure", () => {
    expect(S.heureCloture(etat(), "2026-10-20")).toBeNull();
    expect(S.libelleSecret(etat(), "2026-10-20")).not.toMatch(/\d\d:\d\d/);
  });

  it("clôture illisible : pas d'heure", () => {
    const e = etat({ lignes: { "2026-10-20": { soiree: "2026-10-20", cloture: "pas une date", revele_le: null, motif: null } } });
    expect(S.heureCloture(e, "2026-10-20")).toBeNull();
  });
});

describe("plageDates", () => {
  it("liste les jours inclus", () => {
    expect(S.plageDates("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });
  it("plafonne le nombre de jours", () => {
    expect(S.plageDates("2026-01-01", "2030-01-01", 10)).toHaveLength(10);
  });
  it("fin avant début : vide", () => {
    expect(S.plageDates("2026-10-05", "2026-10-01")).toEqual([]);
  });
});

describe("chargerSecret", () => {
  it("lit le réglage et les lignes", async () => {
    lignesBase = [{ soiree: "2026-10-20", cloture: "2026-10-20T19:00:00Z", revele_le: null, motif: null }];
    const e = await S.chargerSecret({ from }, AUJ);
    expect(e.lisible).toBe(true);
    expect(e.actif).toBe(true);
    expect(e.lignes["2026-10-20"].cloture).toBe("2026-10-20T19:00:00Z");
  });

  it("réglage éteint : lisible et inactif", async () => {
    reglage = { id: 1, actif: false };
    const e = await S.chargerSecret({ from }, AUJ);
    expect(e.actif).toBe(false);
    expect(e.lisible).toBe(true);
    expect(e.compte).toBe("02");
  });

  it("erreur sur le réglage : tout est secret", async () => {
    erreurReglage = "boom";
    const e = await S.chargerSecret({ from }, AUJ);
    expect(e).toEqual(S.ETAT_ILLISIBLE);
    expect(S.soireeSecrete(e, "02", "2026-10-21", AUJ, MAINTENANT)).toBe(true);
  });

  it("réglage absent : tout est secret", async () => {
    reglage = null;
    expect((await S.chargerSecret({ from }, AUJ)).lisible).toBe(false);
  });

  it("erreur sur les lignes : tout est secret", async () => {
    erreurLignes = "boom";
    expect((await S.chargerSecret({ from }, AUJ)).lisible).toBe(false);
  });

  it("exception : tout est secret, sans planter", async () => {
    exception = true;
    expect((await S.chargerSecret({ from }, AUJ)).lisible).toBe(false);
  });
});

describe("refusSecret", () => {
  it("refuse d'écrire pour le 02 sur une soirée secrète, sans nommer de joueur", async () => {
    const m = await S.refusSecret({ from }, ["02"], ["2026-10-21"], AUJ);
    expect(m).toContain("secret pour le 21/10");
  });

  it("laisse passer les autres comptes", async () => {
    expect(await S.refusSecret({ from }, ["01", "03"], ["2026-10-21"], AUJ)).toBeNull();
  });

  it("laisse passer quand le secret est éteint", async () => {
    reglage = { id: 1, actif: false };
    expect(await S.refusSecret({ from }, ["02"], ["2026-10-21"], AUJ)).toBeNull();
  });

  it("laisse passer une soirée révélée", async () => {
    lignesBase = [{ soiree: "2026-10-21", cloture: null, revele_le: "2026-10-20T10:00:00Z", motif: "force" }];
    expect(await S.refusSecret({ from }, ["02"], ["2026-10-21"], AUJ)).toBeNull();
  });

  it("laisse passer une soirée passée", async () => {
    expect(await S.refusSecret({ from }, ["02"], ["2026-10-19"], AUJ)).toBeNull();
  });

  it("refuse quand la lecture est impossible (fail-closed)", async () => {
    erreurReglage = "boom";
    expect(await S.refusSecret({ from }, ["02"], ["2026-10-21"], AUJ)).not.toBeNull();
  });
});

describe("actions : revelerSoiree / reglerSecret", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(MAINTENANT));
  });
  afterEach(() => vi.useRealTimers());

  it("révèle une soirée à venir : motif force et déjà notifiée", async () => {
    const r = await revelerSoiree("2026-10-21");
    expect(r.ok).toBe(true);
    expect(ecritures).toHaveLength(1);
    const e = ecritures[0];
    expect(e.table).toBe("ttfl_secret_pick");
    expect(e.options).toEqual({ onConflict: "soiree" });
    expect(e.valeur).toMatchObject({ soiree: "2026-10-21", motif: "force" });
    const v = e.valeur as Record<string, unknown>;
    expect(v.revele_le).toBeTruthy();
    expect(v.notifie_le).toBe(v.revele_le); // pas de notification ntfy après une révélation forcée
    expect(v).not.toHaveProperty("cloture"); // la clôture écrite par le PC n'est pas écrasée
  });

  it("refuse une date invalide", async () => {
    expect((await revelerSoiree("demain")).ok).toBe(false);
    expect(ecritures).toHaveLength(0);
  });

  it("refuse une soirée passée ou trop lointaine", async () => {
    expect((await revelerSoiree("2026-10-19")).ok).toBe(false);
    expect((await revelerSoiree("2026-12-01")).ok).toBe(false);
    expect(ecritures).toHaveLength(0);
  });

  it("l'interrupteur écrit sur la ligne unique", async () => {
    const r = await reglerSecret(false);
    expect(r.ok).toBe(true);
    expect(ecritures[0]).toMatchObject({ op: "update", table: "ttfl_secret_reglage", valeur: { actif: false } });
    expect(ecritures[0].filtres[0]).toEqual(["id", 1]);
  });
});

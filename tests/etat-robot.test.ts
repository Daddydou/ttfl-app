import { describe, expect, it } from "vitest";
import { alerteCookies, alertePcSilencieux } from "@/lib/etat-robot";

const T = Date.parse("2026-10-12T09:00:00Z");
const il_y_a_h = (h: number) => new Date(T - h * 3600000).toISOString();

describe("alerteCookies", () => {
  it("rien tant que le robot n'a rien déposé", () => {
    expect(alerteCookies(null, T)).toBeNull();
    expect(alerteCookies({}, T)).toBeNull();
  });
  it("danger avec la liste des comptes à renouveler", () => {
    const a = alerteCookies({ le: il_y_a_h(1), total: 12, valides: 11, echecs: ["COOKIE_05 (cookies expirés)"] }, T);
    expect(a?.tone).toBe("danger");
    expect(a?.message).toContain("COOKIE_05");
  });
  it("tout va bien et récent : pas d'alerte", () => {
    expect(alerteCookies({ le: il_y_a_h(10), total: 12, valides: 12, echecs: [] }, T)).toBeNull();
  });
  it("prévient quand le contrôle quotidien a manqué", () => {
    expect(alerteCookies({ le: il_y_a_h(50), total: 12, valides: 12, echecs: [] }, T)?.id).toBe("cookies-controle-ancien");
  });
});

describe("alertePcSilencieux", () => {
  it("pas d'alarme pour un PC lent ou jamais vu", () => {
    expect(alertePcSilencieux(null, T)).toBeNull();
    expect(alertePcSilencieux(il_y_a_h(0.2), T)).toBeNull();
  });
  it("alerte après une heure de silence", () => {
    expect(alertePcSilencieux(il_y_a_h(3), T)?.message).toContain("3 h");
  });
});

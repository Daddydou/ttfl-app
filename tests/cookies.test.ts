// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import sodium from "libsodium-wrappers";
import { ageJours, nomSecret, resumeCookies, statutCookie, validerCookie } from "@/lib/cookies";
import { poserSecretCookie, secretsConfigures } from "@/lib/github-secrets";

describe("validerCookie", () => {
  it("accepte TTFLhash + TTFLmail et normalise", () => {
    const r = validerCookie('  Cookie: "TTFLhash=abc123DEF456ghi789; TTFLmail=jean%40mail.fr"\n');
    expect(r).toEqual({ ok: true, cookie: "TTFLhash=abc123DEF456ghi789; TTFLmail=jean%40mail.fr" });
  });
  it("ordre inversé ou cookies en plus : ne garde que les deux utiles", () => {
    const r = validerCookie("PHPSESSID=zzz; TTFLmail=a%40b.fr; TTFLhash=abcdefghijklmnop");
    expect(r).toEqual({ ok: true, cookie: "TTFLhash=abcdefghijklmnop; TTFLmail=a%40b.fr" });
  });
  it("refuse sans recopier la valeur collée", () => {
    const secret = "TTFLhash=SECRETSECRETSECRET";
    const r = validerCookie(secret);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("SECRETSECRET");
  });
  it("refuse vide, trop court, caractères douteux", () => {
    expect(validerCookie("").ok).toBe(false);
    expect(validerCookie("TTFLhash=a; TTFLmail=b").ok).toBe(false);
    expect(validerCookie("TTFLhash=aaaaaaaaaaaaaaaa\"x; TTFLmail=bbbbbbbbbbbbbbbb").ok).toBe(false);
    expect(validerCookie("pas un cookie du tout, juste du texte").ok).toBe(false);
  });
});

describe("âge et statut des cookies", () => {
  const J = 86400000;
  const MAINT = Date.parse("2026-11-30T12:00:00Z");
  it("statut selon l'âge (45 j = bientôt, 60 j = expiré)", () => {
    expect(statutCookie(null)).toBe("inconnu");
    expect(statutCookie(10)).toBe("ok");
    expect(statutCookie(44)).toBe("ok");
    expect(statutCookie(45)).toBe("bientot");
    expect(statutCookie(60)).toBe("expire");
  });
  it("ageJours : jours entiers, jamais négatif, null si date illisible", () => {
    expect(ageJours("2026-10-15T12:00:00Z", MAINT)).toBe(46);
    expect(ageJours("2027-01-01T00:00:00Z", MAINT)).toBe(0);
    expect(ageJours("n'importe quoi", MAINT)).toBeNull();
    expect(ageJours(null, MAINT)).toBeNull();
  });
  it("résumé des 13 comptes, même si la table est vide", () => {
    expect(resumeCookies([], MAINT)).toHaveLength(13);
    const r = resumeCookies([{ compte: "02", renouvele_le: new Date(MAINT - 50 * J).toISOString(), estime: true }], MAINT);
    expect(r.find((x) => x.compte === "02")).toMatchObject({ jours: 50, estime: true, statut: "bientot" });
    expect(r.find((x) => x.compte === "03")?.statut).toBe("inconnu");
  });
  it("nomSecret : COOKIE_01 … COOKIE_13 seulement", () => {
    expect(nomSecret("01")).toBe("COOKIE_01");
    expect(nomSecret("13")).toBe("COOKIE_13");
    expect(nomSecret("14")).toBeNull();
    expect(nomSecret("../x")).toBeNull();
  });
});

describe("poserSecretCookie (chiffrement vers GitHub)", () => {
  beforeEach(() => { process.env.GITHUB_SECRETS_TOKEN = "jeton-de-test"; });
  afterEach(() => { delete process.env.GITHUB_SECRETS_TOKEN; });

  it("sans jeton : refus clair, aucun appel réseau", async () => {
    delete process.env.GITHUB_SECRETS_TOKEN;
    const f = vi.fn();
    expect(secretsConfigures()).toBe(false);
    const r = await poserSecretCookie("01", "TTFLhash=a; TTFLmail=b", f as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("chiffre avec la clé publique du dépôt : seule la clé privée retrouve la valeur", async () => {
    await sodium.ready;
    const paire = sodium.crypto_box_keypair();
    const cle = sodium.to_base64(paire.publicKey, sodium.base64_variants.ORIGINAL);
    let corps: { encrypted_value: string; key_id: string } | null = null;
    let urlPut = "";
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/public-key")) return new Response(JSON.stringify({ key: cle, key_id: "k1" }), { status: 200 });
      urlPut = String(url);
      corps = JSON.parse(String(init?.body));
      return new Response(null, { status: 204 });
    });
    const valeur = "TTFLhash=abcdefghij; TTFLmail=x%40y.fr";
    const r = await poserSecretCookie("07", valeur, f as unknown as typeof fetch);
    expect(r).toEqual({ ok: true });
    expect(urlPut).toContain("/actions/secrets/COOKIE_07");
    expect(corps!.key_id).toBe("k1");
    expect(corps!.encrypted_value).not.toContain("abcdefghij");
    const clair = sodium.crypto_box_seal_open(
      sodium.from_base64(corps!.encrypted_value, sodium.base64_variants.ORIGINAL), paire.publicKey, paire.privateKey);
    expect(sodium.to_string(clair)).toBe(valeur);
  });

  it("refus de GitHub : message avec le code, sans la valeur", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 403 }));
    const r = await poserSecretCookie("01", "TTFLhash=SECRETSECRETSECRET; TTFLmail=b", f as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toContain("403");
    expect(JSON.stringify(r)).not.toContain("SECRETSECRET");
  });

  it("compte invalide : refus sans appel", async () => {
    const f = vi.fn();
    expect((await poserSecretCookie("99", "x", f as unknown as typeof fetch)).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});

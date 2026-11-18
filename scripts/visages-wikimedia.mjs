// Génère lib/visages-data.json : pour chaque joueur, la photo LIBRE (Wikimedia Commons) quand il y en a une.
//
// Source : Wikidata (propriété P18 « image » = toujours un fichier Commons, donc sous licence libre) puis l'API de Commons
// pour la licence et l'auteur. AUCUNE image n'est téléchargée : on ne garde que l'adresse de la miniature, le nom de
// l'auteur et la licence (la page « Crédits photos » de l'application les affiche). Un joueur sans photo libre est listé
// dans `sansPhoto` : l'application affiche ses initiales.
//
// Usage (depuis la racine de ttfl-app) :
//   node scripts/visages-wikimedia.mjs <joueurs.csv> [--tout]
// joueurs.csv : colonnes `player,team,...` (une ligne d'en-tête). Sans --tout, les joueurs déjà résolus sont conservés
// (seuls les nouveaux sont cherchés). Prudence sur les homonymes : sans équipe confirmée par Wikidata ET sans candidat
// unique, on préfère « pas de photo » à une mauvaise photo.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SORTIE = resolve(process.env.VISAGES_SORTIE ?? "lib/visages-data.json");
const UA = "TTFL-app/1.0 (application privee de fantasy NBA; https://github.com/Daddydou/ttfl-app)";
const LARGEUR = 128; // miniature affichée à ~40 px : 128 px reste net sur écran retina
const PAUSE_MS = 250;
const LICENCES_OK = /^(cc[ -]?by|cc0|public domain|pd\b|domaine public)/i;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  for (let essai = 1; essai <= 4; essai++) {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) {
      await pause(2000 * essai);
      continue;
    }
    throw new Error(`HTTP ${r.status} sur ${base}`);
  }
  throw new Error(`Trop d'échecs sur ${base}`);
}
const wikidata = (p) => api("https://www.wikidata.org/w/api.php", p);
const commons = (p) => api("https://commons.wikimedia.org/w/api.php", p);

// Même idée que normaliserNom de l'application : sans accents, sans ponctuation, sans Jr/Sr/II/III.
export function norm(nom) {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.'’`-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lireCsv(chemin) {
  const lignes = readFileSync(chemin, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const [entete, ...reste] = lignes;
  const cols = entete.split(",");
  const iJ = cols.indexOf("player");
  const iE = cols.indexOf("team");
  return reste
    .map((l) => l.split(","))
    .filter((c) => c[iJ])
    .map((c) => ({ nom: c[iJ].trim(), equipe: (c[iE] ?? "").trim() }));
}

const qids = (entite, prop) =>
  (entite.claims?.[prop] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);

function fichierImage(entite) {
  const liste = entite.claims?.P18 ?? [];
  const choix = liste.find((c) => c.rank === "preferred") ?? liste.find((c) => c.rank !== "deprecated");
  return choix?.mainsnak?.datavalue?.value ?? null;
}

function anneeNaissance(entite) {
  const t = entite.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time; // "+2001-04-14T00:00:00Z"
  const m = /^[+-]?(\d{4})/.exec(t ?? "");
  return m ? Number(m[1]) : null;
}

async function entites(ids, props) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const lot = ids.slice(i, i + 50);
    const r = await wikidata({ action: "wbgetentities", ids: lot.join("|"), props, languages: "en", languagefallback: "1" });
    Object.assign(out, r.entities ?? {});
    await pause(PAUSE_MS);
  }
  return out;
}

async function chercherCandidats(nom) {
  const r = await wikidata({ action: "wbsearchentities", search: nom, language: "en", type: "item", limit: "10" });
  await pause(PAUSE_MS);
  return (r.search ?? []).map((x) => x.id);
}

function extraireTexte(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const args = process.argv.slice(2);
  const csv = args.find((a) => !a.startsWith("--"));
  if (!csv) throw new Error("Usage : node scripts/visages-wikimedia.mjs <joueurs.csv> [--tout]");
  const tout = args.includes("--tout");
  const joueurs = lireCsv(csv);
  const ancien = existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, "utf8")) : { visages: {}, sansPhoto: [] };
  const visages = tout ? {} : { ...ancien.visages };
  const dejaVus = new Set(tout ? [] : [...Object.keys(visages), ...(ancien.sansPhoto ?? [])]);
  const aTraiter = joueurs.filter((j) => !dejaVus.has(j.nom));
  console.log(`${joueurs.length} joueurs, ${aTraiter.length} à chercher.`);

  // 1. Candidats Wikidata de chaque joueur.
  const candidatsDe = new Map();
  for (const [i, j] of aTraiter.entries()) {
    candidatsDe.set(j.nom, await chercherCandidats(j.nom));
    if ((i + 1) % 25 === 0) console.log(`  recherche ${i + 1}/${aTraiter.length}`);
  }
  const tousIds = [...new Set([...candidatsDe.values()].flat())];
  const ents = await entites(tousIds, "claims|labels");

  // 2. Équipes citées (P54) : leurs noms servent à confirmer le bon joueur en cas d'homonymes.
  const equipesIds = new Set();
  for (const e of Object.values(ents)) qids(e, "P54").forEach((q) => equipesIds.add(q));
  const equipes = await entites([...equipesIds], "labels");
  const nomEquipe = (q) => equipes[q]?.labels?.en?.value ?? "";

  // 3. Choix du candidat.
  const choisis = new Map(); // nom -> { fichier, sur }
  const sansPhoto = [];
  for (const j of aTraiter) {
    const cle = norm(j.nom);
    const bons = (candidatsDe.get(j.nom) ?? [])
      .map((id) => ents[id])
      .filter((e) => e && qids(e, "P31").includes("Q5") && qids(e, "P106").includes("Q3665646"))
      .filter((e) => norm(e.labels?.en?.value ?? "") === cle);
    const avecPhoto = bons.filter((e) => fichierImage(e));
    const equipeConfirmee = avecPhoto.filter(
      (e) => j.equipe && qids(e, "P54").some((q) => nomEquipe(q).toLowerCase() === j.equipe.toLowerCase()),
    );
    let retenu = null;
    if (equipeConfirmee.length === 1) retenu = { e: equipeConfirmee[0], sur: "equipe" };
    else if (bons.length === 1 && avecPhoto.length === 1 && (anneeNaissance(avecPhoto[0]) ?? 0) >= 1985) {
      retenu = { e: avecPhoto[0], sur: "unique" };
    }
    if (retenu) choisis.set(j.nom, { fichier: fichierImage(retenu.e), sur: retenu.sur });
    else {
      sansPhoto.push(j.nom);
      const raison = bons.length === 0 ? "aucun joueur de basket de ce nom sur Wikidata" : avecPhoto.length === 0 ? "pas de photo sur Wikidata" : "homonymes non départagés";
      if (process.env.VISAGES_DETAIL) console.log(`  sans photo : ${j.nom} -> ${raison}`);
    }
  }

  // 4. Licence, auteur et miniature (API de Commons) : on n'accepte que les licences libres.
  const fichiers = [...new Set([...choisis.values()].map((c) => c.fichier))];
  const infos = new Map();
  for (let i = 0; i < fichiers.length; i += 40) {
    const lot = fichiers.slice(i, i + 40);
    const r = await commons({
      action: "query",
      titles: lot.map((f) => `File:${f}`).join("|"),
      prop: "imageinfo",
      iiprop: "extmetadata|url",
      iiurlwidth: String(LARGEUR),
      redirects: "1", // un fichier renommé sur Commons reste joignable par son ancien nom
    });
    // Ancien nom -> nom final (normalisation de la casse/espaces, puis redirections).
    const sansFile = (t) => String(t).replace(/^File:/, "").replace(/ /g, "_");
    const renvoi = new Map();
    for (const n of r.query?.normalized ?? []) renvoi.set(sansFile(n.from), sansFile(n.to));
    for (const d of r.query?.redirects ?? []) {
      for (const [de, vers] of renvoi) if (vers === sansFile(d.from)) renvoi.set(de, sansFile(d.to));
      renvoi.set(sansFile(d.from), sansFile(d.to));
    }
    for (const p of Object.values(r.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      const info = {
        url: ii.thumburl ?? ii.url,
        page: ii.descriptionurl,
        licence: extraireTexte(m.LicenseShortName?.value),
        auteur: extraireTexte(m.Artist?.value) || extraireTexte(m.Credit?.value) || "Auteur inconnu",
      };
      const final = sansFile(p.title);
      infos.set(final, info);
      for (const [de, vers] of renvoi) if (vers === final) infos.set(de, info);
    }
    await pause(PAUSE_MS);
  }

  const refusees = [];
  for (const [nom, c] of choisis) {
    const info = infos.get(c.fichier.replace(/ /g, "_"));
    if (!info || !info.url || !LICENCES_OK.test(info.licence)) {
      sansPhoto.push(nom);
      if (process.env.VISAGES_DETAIL) console.log(`  sans photo : ${nom} -> licence/miniature (${info?.licence || "introuvable"})`);
      refusees.push(`${nom} (${info?.licence || "licence illisible"})`);
      continue;
    }
    visages[nom] = { url: info.url, auteur: info.auteur.slice(0, 120), licence: info.licence, page: info.page, fichier: c.fichier };
  }

  const tri = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b, "fr")));
  const sortie = {
    genereLe: new Date().toISOString(),
    source: "Wikidata (P18) + Wikimedia Commons : fichiers sous licence libre uniquement",
    visages: tri(visages),
    sansPhoto: [...new Set([...(tout ? [] : ancien.sansPhoto ?? []), ...sansPhoto])]
      .filter((n) => !visages[n])
      .sort((a, b) => a.localeCompare(b, "fr")),
  };
  writeFileSync(SORTIE, JSON.stringify(sortie, null, 1) + "\n", "utf8");
  console.log(`\nPhotos libres : ${Object.keys(sortie.visages).length} / ${joueurs.length}. Sans photo : ${sortie.sansPhoto.length}.`);
  if (refusees.length) console.log(`Licence refusée : ${refusees.join(" ; ")}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

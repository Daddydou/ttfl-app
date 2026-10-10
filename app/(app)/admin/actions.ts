"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIONS_PC,
  MOT_CONFIRMATION,
  dateReelle,
  nettoyerParams,
  planifierCopie,
  planifierEcritures,
  validerPlage,
  type Ecriture,
  type Probleme,
} from "@/lib/admin";
import { COMPTE_VALIDE, JOURS_CYCLE, ajouterJours, aujourdhuiNY, type PickLigne } from "@/lib/planning";
import { frDate } from "@/lib/format";
import type { Mode } from "@/lib/types";

export type ResultatAdmin = { ok: true; message: string; details: string[] } | { ok: false; error: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

const NON_AUTORISE = "Mode non pris en charge : les opérations en masse concernent la saison régulière.";

function revalider() {
  revalidatePath("/");
  revalidatePath("/ce-soir");
  revalidatePath("/picks");
  revalidatePath("/stats");
  revalidatePath("/admin");
}

function comptesValides(comptes: string[]): string[] | null {
  const liste = [...new Set(comptes)];
  return liste.length > 0 && liste.length <= 12 && liste.every((c) => COMPTE_VALIDE.test(c)) ? liste : null;
}

async function picksExistants(supabase: Supabase, mode: Mode, comptes: string[], debut: string, fin: string) {
  const { data, error } = await supabase
    .from("ttfl_picks")
    .select("pick_date,player,compte")
    .eq("mode", mode)
    .in("compte", comptes)
    .gte("pick_date", ajouterJours(debut, -JOURS_CYCLE))
    .lte("pick_date", ajouterJours(fin, JOURS_CYCLE))
    .returns<PickLigne[]>();
  return { picks: data ?? [], erreur: error?.message ?? null };
}

const decrire = (p: Probleme) => `${frDate(p.date)} · compte ${p.compte} · ${p.player} — ${p.raison}`;

async function appliquer(supabase: Supabase, mode: Mode, ecritures: Ecriture[]): Promise<string | null> {
  for (let i = 0; i < ecritures.length; i += 200) {
    const lot = ecritures.slice(i, i + 200).map((e) => ({
      mode, pick_date: e.date, player: e.player, compte: e.compte, source: "app",
    }));
    const { error } = await supabase.from("ttfl_picks").upsert(lot, { onConflict: "mode,pick_date,compte" });
    if (error) return error.message;
  }
  return null;
}

function bilan(verbe: string, ecritures: Ecriture[], problemes: Probleme[], ecrit: boolean): ResultatAdmin {
  const comptes = new Set(ecritures.map((e) => e.compte)).size;
  const base = ecrit
    ? `${ecritures.length} pick(s) ${verbe}(s) sur ${comptes} compte(s).`
    : `Vérifié : ${ecritures.length} pick(s) seraient ${verbe}(s) sur ${comptes} compte(s).`;
  const refus = problemes.length > 0 ? ` ${problemes.length} refusé(s) par le cycle de ${JOURS_CYCLE} jours.` : "";
  if (ecritures.length === 0 && problemes.length > 0) {
    return { ok: false, error: `Rien à écrire : ${problemes.length} pick(s) refusé(s) par le cycle de ${JOURS_CYCLE} jours.` };
  }
  return { ok: true, message: base + refus, details: problemes.slice(0, 15).map(decrire) };
}

// --- Actions sur le PC (file de commandes) ---------------------------------------------------------------------

export async function lancerCommande(type: string, params: Record<string, unknown> = {}): Promise<ResultatAdmin> {
  const action = ACTIONS_PC.find((a) => a.id === type);
  if (!action) return { ok: false, error: "Action inconnue." };
  const propres = nettoyerParams(action, params ?? {});
  if ("error" in propres) return { ok: false, error: propres.error };

  const supabase = await createClient();
  const { data: actives, error: errActives } = await supabase
    .from("ttfl_commandes")
    .select("id")
    .eq("type", type)
    .in("statut", ["en_attente", "en_cours"])
    .limit(1)
    .returns<{ id: number }[]>();
  if (errActives) return { ok: false, error: errActives.message };
  if ((actives ?? []).length > 0) return { ok: false, error: "Cette action est déjà en attente ou en cours." };

  const { error } = await supabase.from("ttfl_commandes").insert({ type, params: propres.params });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Demandée : l'exécuteur du PC la prend en charge dans la minute.", details: [] };
}

export async function annulerCommande(id: number): Promise<ResultatAdmin> {
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "Commande invalide." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("ttfl_commandes")
    .update({ statut: "annule", fin_le: new Date().toISOString(), resume: "Annulée avant exécution." })
    .eq("id", id)
    .eq("statut", "en_attente");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Annulée.", details: [] };
}

// --- Picks en masse ------------------------------------------------------------------------------------------------

// Importe une liste de picks (date + joueur) sur des comptes. `ecrire: false` = vérification seule, rien n'est écrit.
export async function importerPicks(
  mode: Mode,
  lignes: { date: string; player: string }[],
  comptes: string[],
  ecrire: boolean,
): Promise<ResultatAdmin> {
  if (mode !== "regular") return { ok: false, error: NON_AUTORISE };
  const liste = comptesValides(comptes);
  if (!liste) return { ok: false, error: "Choisis au moins un compte (12 au plus)." };
  if (lignes.length === 0 || lignes.length > 400) return { ok: false, error: "Entre 1 et 400 lignes." };
  const propres = lignes.map((l) => ({ date: l.date, player: String(l.player).replace(/\s+/g, " ").trim() }));
  if (propres.some((l) => !dateReelle(l.date) || l.player.length < 2 || l.player.length > 80)) {
    return { ok: false, error: "Une ligne est invalide (date ou joueur)." };
  }
  if (new Set(propres.map((l) => l.date)).size !== propres.length) {
    return { ok: false, error: "Deux lignes ont la même date (un pick par soirée et par compte)." };
  }

  const dates = propres.map((l) => l.date).sort();
  const supabase = await createClient();
  const { picks, erreur } = await picksExistants(supabase, mode, liste, dates[0], dates[dates.length - 1]);
  if (erreur) return { ok: false, error: erreur };

  const plan = planifierEcritures({ lignes: propres, comptes: liste, existants: picks });
  if (ecrire && plan.ecritures.length > 0) {
    const err = await appliquer(supabase, mode, plan.ecritures);
    if (err) return { ok: false, error: err };
    revalider();
  }
  return bilan("importé", plan.ecritures, plan.problemes, ecrire);
}

// Copie les picks d'un compte (sur une plage de dates) vers d'autres comptes.
export async function copierPicks(
  mode: Mode,
  source: string,
  destinations: string[],
  debut: string,
  fin: string,
  ecrire: boolean,
): Promise<ResultatAdmin> {
  if (mode !== "regular") return { ok: false, error: NON_AUTORISE };
  if (!COMPTE_VALIDE.test(source)) return { ok: false, error: "Compte source invalide." };
  const liste = comptesValides(destinations.filter((c) => c !== source));
  if (!liste) return { ok: false, error: "Choisis au moins un compte de destination (différent de la source)." };
  const erreurPlage = validerPlage(debut, fin, aujourdhuiNY());
  if (erreurPlage) return { ok: false, error: erreurPlage };

  const supabase = await createClient();
  const { picks: sources, erreur: e1 } = await picksExistants(supabase, mode, [source], debut, fin);
  if (e1) return { ok: false, error: e1 };
  const aCopier = sources.filter((p) => p.pick_date >= debut && p.pick_date <= fin);
  if (aCopier.length === 0) return { ok: false, error: `Le compte ${source} n'a aucun pick entre ces dates.` };

  const { picks: existants, erreur: e2 } = await picksExistants(supabase, mode, liste, debut, fin);
  if (e2) return { ok: false, error: e2 };
  const plan = planifierCopie({ source: aCopier, destinations: liste, existants });
  if (ecrire && plan.ecritures.length > 0) {
    const err = await appliquer(supabase, mode, plan.ecritures);
    if (err) return { ok: false, error: err };
    revalider();
  }
  return bilan("copié", plan.ecritures, plan.problemes, ecrire);
}

// Supprime des picks FUTURS (jamais ceux du passé : ils portent les scores). Ne retire rien sur le site TTFL.
export async function supprimerPicks(
  mode: Mode,
  comptes: string[],
  debut: string,
  fin: string,
  confirmation: string,
  ecrire: boolean,
): Promise<ResultatAdmin> {
  if (mode !== "regular") return { ok: false, error: NON_AUTORISE };
  const liste = comptesValides(comptes);
  if (!liste) return { ok: false, error: "Choisis au moins un compte." };
  const erreurPlage = validerPlage(debut, fin, aujourdhuiNY(), true);
  if (erreurPlage) return { ok: false, error: erreurPlage };
  if (ecrire && confirmation.trim() !== MOT_CONFIRMATION) {
    return { ok: false, error: `Tape ${MOT_CONFIRMATION} pour confirmer.` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ttfl_picks")
    .select("id,pick_date,compte")
    .eq("mode", mode)
    .in("compte", liste)
    .gte("pick_date", debut)
    .lte("pick_date", fin)
    .returns<{ id: number; pick_date: string; compte: string }[]>();
  if (error) return { ok: false, error: error.message };
  const lignes = data ?? [];
  if (lignes.length === 0) return { ok: false, error: "Aucun pick à supprimer sur cette plage." };

  const resume = `${lignes.length} pick(s) sur ${new Set(lignes.map((l) => l.compte)).size} compte(s), du ${frDate(debut)} au ${frDate(fin)}`;
  if (!ecrire) {
    return { ok: true, message: `Vérifié : ${resume} seraient supprimés (rien n'est retiré sur le site TTFL).`, details: [] };
  }
  const { error: errSupp } = await supabase
    .from("ttfl_picks")
    .delete()
    .eq("mode", mode)
    .in("compte", liste)
    .gte("pick_date", debut)
    .lte("pick_date", fin);
  if (errSupp) return { ok: false, error: errSupp.message };
  revalider();
  return { ok: true, message: `Supprimé : ${resume}. Rien n'est retiré sur le site TTFL.`, details: [] };
}

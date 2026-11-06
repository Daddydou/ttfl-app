import { createClient } from "@/lib/supabase/server";
import { GrilleX2, type CelluleX2, type LigneGrille } from "@/components/admin/GrilleX2";
import { PoserX2, type PickProposable } from "@/components/admin/PoserX2";
import { ReglageX2 } from "@/components/admin/ReglageX2";
import { PageHeader } from "@/components/ui/PageHeader";
import { aujourdhuiNY } from "@/lib/planning";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import { chargerSecret, soireeSecrete } from "@/lib/secret";
import { COMPTES_X2, MOIS_SAISON, lireModeX2, type LigneX2 } from "@/lib/x2";

export const dynamic = "force-dynamic";
export const metadata = { title: "x2 — Admin — TTFL" };

const jj = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default async function AdminX2Page() {
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const [regRes, lignesRes, picksRes, secret] = await Promise.all([
    supabase.from("ttfl_x2_reglage").select("mode,comptes_reels").eq("id", 1).maybeSingle<{ mode: string; comptes_reels: string[] }>(),
    supabase.from("ttfl_x2").select("*").eq("mode", "regular").returns<LigneX2[]>(),
    supabase
      .from("ttfl_picks")
      .select("pick_date,player,compte")
      .eq("mode", "regular")
      .gte("pick_date", aujourdhui)
      .order("pick_date")
      .returns<{ pick_date: string; player: string; compte: string }[]>(),
    chargerSecret(supabase, aujourdhui),
  ]);
  const maintenant = heureServeur();
  const cache = (compte: string, date: string) => soireeSecrete(secret, compte, date, aujourdhui, maintenant);
  const tableAbsente = !!(regRes.error || lignesRes.error);

  const mode = lireModeX2(regRes.data?.mode);
  const lignes = lignesRes.data ?? [];
  const grille: LigneGrille[] = COMPTES_X2.map((compte) => {
    const cellules: Record<string, CelluleX2 | null> = {};
    for (const m of MOIS_SAISON) {
      const l = lignes.find((x) => x.compte === compte && x.mois === m);
      if (!l) { cellules[m] = null; continue; }
      const date = String(l.pick_date).slice(0, 10);
      const secrete = cache(compte, date) || (l.date_site ? cache(compte, String(l.date_site).slice(0, 10)) : false);
      cellules[m] = {
        mois: m, statut: l.statut, date: secrete ? "" : jj(date), joueur: secrete ? null : l.player,
        source: l.source, message: secrete ? null : l.message,
      };
    }
    return { compte, cellules };
  });

  const jourFr = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const proposables: PickProposable[] = (picksRes.data ?? [])
    .map((p) => ({ ...p, pick_date: String(p.pick_date).slice(0, 10) }))
    .filter((p) => (MOIS_SAISON as readonly string[]).includes(p.pick_date.slice(0, 7)) && !cache(p.compte, p.pick_date))
    .map((p) => ({ compte: p.compte, date: p.pick_date, libelle: `${jourFr(p.pick_date)} · ${p.player}` }));

  return (
    <div className="space-y-5">
      <PageHeader titre="x2" sousTitre="Bonus ×2 : un par mois et par compte, lié au joueur." retour={{ href: "/admin", libelle: "Admin" }} />
      {tableAbsente && (
        <p className="rounded-[10px] bg-out/10 px-3 py-2 text-[13px] text-out">
          Les tables du x2 ne sont pas encore créées dans la base : applique d&apos;abord la migration (ttfl/pont/migration_x2.sql).
        </p>
      )}
      <ReglageX2 mode={mode} comptes={[...(regRes.data?.comptes_reels ?? [])].sort()} />
      <PoserX2 picks={proposables} />
      <GrilleX2 lignes={grille} />
      <p className="px-1 text-[13px] text-fg-muted">
        Comptes 02 à 13 : le moteur choisit seul le x2 de chaque mois (meilleur joueur du classement des moyennes TTFL
        disponible, jamais deux fois le même sur un compte). Si le joueur n&apos;est plus pické (blessure, changement),
        le x2 est retiré du site puis reposé ailleurs ce mois-ci. Le compte 01 reste à toi.
      </p>
    </div>
  );
}

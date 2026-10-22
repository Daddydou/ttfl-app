import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListeJournal } from "@/components/admin/JournalActions";
import { chargerSecret } from "@/lib/secret";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import { aujourdhuiNY } from "@/lib/planning";
import {
  COLONNES_JOURNAL, FILTRES, PERIODES, filtrer, filtreValide, grouperParCause, masquerJournal, periodeValide,
  type EntreeJournal,
} from "@/lib/journal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal — TTFL" };

const MAX_LIGNES = 600; // lignes lues par période ; l'affichage est limité aux 150 groupes les plus récents

// LECTURE SEULE : toutes les actions (demandes, calculs, picks, envois, réglages, robots) et leurs conséquences.
export default async function JournalPage({ searchParams }: { searchParams: Promise<{ f?: string; p?: string }> }) {
  const { f, p } = await searchParams;
  const filtre = filtreValide(f);
  const jours = periodeValide(p);

  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const maintenantMs = heureServeur();
  const depuis = new Date(maintenantMs - jours * 86400000).toISOString();
  const [res, secret] = await Promise.all([
    supabase.from("ttfl_journal").select(COLONNES_JOURNAL).gte("le", depuis).order("id", { ascending: false }).limit(MAX_LIGNES)
      .returns<EntreeJournal[]>(),
    chargerSecret(supabase, aujourdhui),
  ]);

  const entrees = masquerJournal(res.data ?? [], secret, aujourdhui, maintenantMs);
  const groupes = grouperParCause(filtrer(entrees, filtre)).slice(0, 150);
  const lien = (nf: string, np: number) => `/admin/journal?f=${nf}&p=${np}`;
  const puce = (actif: boolean) => `btn btn-sm ${actif ? "btn-primary" : "btn-secondary"}`;

  return (
    <div className="space-y-5">
      <PageHeader
        titre="Journal"
        sousTitre="Chaque action et ce qu'elle a provoqué, que ça vienne du téléphone, du PC ou du cloud."
        action={<Link href="/admin" className="text-[13px] font-semibold text-court-400">Admin</Link>}
      />

      <nav aria-label="Filtres" className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {FILTRES.map((x) => (
            <Link key={x.id} href={lien(x.id, jours)} className={puce(x.id === filtre)} aria-current={x.id === filtre ? "true" : undefined}>
              {x.libelle}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Période">
          {PERIODES.map((n) => (
            <Link key={n} href={lien(filtre, n)} className={puce(n === jours)} aria-current={n === jours ? "true" : undefined}>
              {n === 1 ? "24 h" : `${n} jours`}
            </Link>
          ))}
        </div>
      </nav>

      {res.error ? (
        <p className="card px-4 py-6 text-center text-sm text-fg-muted">
          Journal pas encore activé (migration « journal » à appliquer sur Supabase).
        </p>
      ) : (
        <ListeJournal groupes={groupes} vide="Rien à signaler sur cette période." />
      )}
      <p className="px-1 text-[12px] text-fg-muted">
        Le pick du compte 02 reste caché ici tant que la soirée n&apos;est pas close. Les lignes sont gardées 120 jours.
      </p>
    </div>
  );
}

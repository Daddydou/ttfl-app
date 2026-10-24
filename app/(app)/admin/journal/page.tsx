import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListeJournal } from "@/components/admin/JournalActions";
import { grouperParCause, FILTRES, PERIODES, filtreValide, periodeValide, rechercheValide } from "@/lib/journal";
import { chargerJournal } from "@/lib/journal-charge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal — TTFL" };

// LECTURE SEULE : toutes les actions (demandes, calculs, picks, envois, réglages, robots) et leurs conséquences.
// L'affichage est limité aux 150 groupes les plus récents.
export default async function JournalPage({ searchParams }: { searchParams: Promise<{ f?: string; p?: string; q?: string }> }) {
  const { f, p, q: qBrut } = await searchParams;
  const filtre = filtreValide(f);
  const jours = periodeValide(p);
  const q = rechercheValide(qBrut);

  const supabase = await createClient();
  const { entrees, erreur } = await chargerJournal(supabase, { jours, filtre, q });
  const groupes = grouperParCause(entrees).slice(0, 150);

  const params = (nf: string, np: number, avecQ = true) => {
    const s = new URLSearchParams({ f: nf, p: String(np) });
    if (q && avecQ) s.set("q", q);
    return s.toString();
  };
  const lien = (nf: string, np: number, avecQ = true) => `/admin/journal?${params(nf, np, avecQ)}`;
  const puce = (actif: boolean) => `chip ${actif ? "chip-on" : ""}`; // filtres : chips du système (orange = sélection seulement)

  return (
    <div className="space-y-5">
      <PageHeader
        titre="Journal"
        sousTitre="Chaque action et ce qu'elle a provoqué, que ça vienne du téléphone, du PC ou du cloud."
        retour={{ href: "/admin", libelle: "Admin" }}
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
        <form method="get" action="/admin/journal" role="search" className="flex gap-2">
          <input type="hidden" name="f" value={filtre} />
          <input type="hidden" name="p" value={jours} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={60}
            placeholder="Chercher (joueur, compte, action…)"
            aria-label="Chercher dans le journal"
            className="field min-w-0 flex-1 !py-2"
          />
          <button type="submit" className="btn btn-sm btn-plain">Chercher</button>
          {q && <Link href={lien(filtre, jours, false)} className="btn btn-sm btn-plain">Effacer</Link>}
        </form>
      </nav>

      {erreur ? (
        <p className="card px-4 py-6 text-center text-sm text-fg-muted">
          Journal pas encore activé (migration « journal » à appliquer sur Supabase).
        </p>
      ) : (
        <ListeJournal groupes={groupes} vide={q ? "Aucun résultat pour cette recherche." : "Rien à signaler sur cette période."} />
      )}
      <div className="flex items-center justify-between gap-3 px-1 text-[12px] text-fg-muted">
        <p>Le pick du compte 02 reste caché ici tant que la soirée n&apos;est pas close. Les lignes sont gardées 120 jours.</p>
        {!erreur && (
          <a href={`/admin/journal/export?${params(filtre, jours)}`} className="shrink-0 font-semibold text-court-400" download>
            Exporter (CSV)
          </a>
        )}
      </div>
    </div>
  );
}

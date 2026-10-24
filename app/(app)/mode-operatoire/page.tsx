import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { MODES, modesParSection } from "@/lib/modes-operatoires";

export const metadata = { title: "Mode opératoire — TTFL" };

// AAAA-MM-JJ → JJ/MM/AAAA
function dateFr(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

// LECTURE SEULE : tout le contenu vient de lib/modes-operatoires.ts (un seul fichier à modifier).
export default function ModeOperatoirePage() {
  const groupes = modesParSection();

  return (
    <div className="space-y-5">
      <PageHeader
        titre="Mode opératoire"
        sousTitre={`${MODES.length} fiches : pour quoi faire, quand, et quoi faire pas à pas.`}
        retour={{ href: "/plus", libelle: "Plus" }}
      />

      <nav aria-label="Sections du mode opératoire" className="flex flex-wrap gap-2">
        {groupes.map(({ section }) => (
          <a key={section.id} href={`#section-${section.id}`} className="btn btn-sm btn-secondary">
            {section.titre}
          </a>
        ))}
      </nav>

      {groupes.map(({ section, modes }) => (
        <section key={section.id} id={`section-${section.id}`} className="space-y-2" aria-labelledby={`titre-${section.id}`}>
          <div className="px-1">
            <h2 id={`titre-${section.id}`} className="section-label">{section.titre}</h2>
            <p className="mt-0.5 text-[13px] text-fg-muted">{section.description}</p>
          </div>
          <ul className="card divide-y divide-line overflow-hidden">
            {modes.map((m) => (
              <li key={m.id} id={m.id} className="px-4 py-3">
                <details>
                  <summary className="cursor-pointer list-none">
                    <span className="block text-[16px] font-semibold leading-snug text-fg">{m.titre}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-fg-muted">{m.pourQuoi}</span>
                  </summary>
                  <div className="mt-3 space-y-3 text-[14px] leading-snug text-fg">
                    <p>
                      <span className="font-semibold">Quand : </span>
                      <span className="text-fg-muted">{m.quand}</span>
                    </p>
                    <ol className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-fg-muted">
                      {m.etapes.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ol>
                    {m.attention && m.attention.length > 0 && (
                      <div className="space-y-1 rounded-[10px] bg-quest/10 px-3 py-2 text-[13px] text-quest">
                        <p className="font-semibold">À retenir</p>
                        <ul className="list-disc space-y-1 pl-4">
                          {m.attention.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 text-[12px] text-fg-muted">
                      <span>Mis à jour le {dateFr(m.misAJour)}</span>
                      {m.lien && (
                        <Link href={m.lien.href} className="font-semibold text-court-400">
                          {m.lien.libelle} →
                        </Link>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="px-1 text-[12px] text-fg-muted">
        Ces fiches pourront être modifiées à tout moment : demande à Claude « modifie le mode opératoire X ».
      </p>
    </div>
  );
}

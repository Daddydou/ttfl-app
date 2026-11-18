import { PageHeader } from "@/components/ui/PageHeader";
import { creditsVisages, nbSansPhoto } from "@/lib/visages";

export const metadata = { title: "Crédits photos — TTFL" };

// Les photos des joueurs viennent de Wikimedia Commons (fichiers sous licence libre). Les licences CC BY / CC BY-SA
// demandent de citer l'auteur : c'est cette page. LECTURE SEULE : tout vient de lib/visages-data.json.
export default function CreditsPhotosPage() {
  const credits = creditsVisages();
  const sans = nbSansPhoto();

  return (
    <div className="space-y-5">
      <PageHeader
        titre="Crédits photos"
        sousTitre={`${credits.length} photos libres de droits (Wikimedia Commons). ${sans} joueur${sans > 1 ? "s" : ""} sans photo libre : leurs initiales s'affichent.`}
        retour={{ href: "/plus", libelle: "Plus" }}
      />

      <p className="text-[13px] text-fg-muted">
        Chaque photo est publiée sous une licence qui autorise sa réutilisation à condition de citer l&apos;auteur. Touche un
        nom pour ouvrir la page de la photo (auteur, licence, fichier d&apos;origine).
      </p>

      <ul className="card divide-y divide-line overflow-hidden">
        {credits.map((c) => (
          <li key={c.nom} className="px-4 py-2.5 text-[13px]">
            <a href={c.page} target="_blank" rel="noopener noreferrer" className="font-semibold text-fg underline-offset-2 hover:underline">
              {c.nom}
            </a>
            <span className="block text-fg-muted">
              {c.auteur} · {c.licence}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Suspense, type ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsNav } from "@/components/stats/StatsNav";

// Cadre commun de toutes les sous-pages Stats : titre, retour vers « Plus » et menu des sous-pages.
export default function StatsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <PageHeader titre="Stats" sousTitre="Toutes les statistiques de la chaîne" retour={{ href: "/plus", libelle: "Plus" }} />
      <Suspense fallback={<div className="h-9" />}>
        <StatsNav />
      </Suspense>
      {children}
    </div>
  );
}

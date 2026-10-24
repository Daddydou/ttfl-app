import { PicksEnMasse } from "@/components/admin/PicksEnMasse";
import { PageHeader } from "@/components/ui/PageHeader";
import { aujourdhuiNY } from "@/lib/planning";

export const dynamic = "force-dynamic";
export const metadata = { title: "Picks en masse — Admin — TTFL" };

export default function AdminMassePage() {
  return (
    <div className="space-y-5">
      <PageHeader titre="Picks en masse" retour={{ href: "/admin", libelle: "Admin" }} />
      <PicksEnMasse aujourdhui={aujourdhuiNY()} />
    </div>
  );
}

import { PushToggle } from "@/components/admin/PushToggle";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Notifications — Admin — TTFL" };

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader titre="Notifications" retour={{ href: "/admin", libelle: "Admin" }} />
      <PushToggle />
    </div>
  );
}

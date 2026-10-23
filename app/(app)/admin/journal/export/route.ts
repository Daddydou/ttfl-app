import { createClient } from "@/lib/supabase/server";
import { filtreValide, periodeValide, rechercheValide, versCsv } from "@/lib/journal";
import { chargerJournal } from "@/lib/journal-charge";
import { aujourdhuiNY } from "@/lib/planning";

export const dynamic = "force-dynamic";

// Export CSV du journal (mêmes filtres que la page ; le pick secret reste masqué).
export async function GET(req: Request) {
  const u = new URL(req.url);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return new Response("Non connecté", { status: 401 });

  const { entrees, erreur } = await chargerJournal(supabase, {
    jours: periodeValide(u.searchParams.get("p") ?? undefined),
    filtre: filtreValide(u.searchParams.get("f") ?? undefined),
    q: rechercheValide(u.searchParams.get("q") ?? undefined),
  });
  if (erreur) return new Response("Journal indisponible", { status: 503 });

  return new Response(versCsv(entrees), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-ttfl-${aujourdhuiNY()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

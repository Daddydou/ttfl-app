import { humanAge } from "@/lib/format";
import { resumeSante, type NiveauSante, type TacheSante } from "@/lib/sante";

const PASTILLE: Record<NiveauSante, { point: string; texte: string; label: string }> = {
  ok: { point: "bg-avail", texte: "text-avail", label: "OK" },
  retard: { point: "bg-quest", texte: "text-quest", label: "En retard" },
  panne: { point: "bg-out", texte: "text-out", label: "À l'arrêt" },
  inconnu: { point: "bg-ink-600", texte: "text-fg-muted", label: "Jamais vu" },
  info: { point: "bg-fg-muted", texte: "text-fg-muted", label: "" }, // simple information : neutre (orange = action)
};

const BANDEAU: Record<NiveauSante, string> = {
  ok: "bg-avail/10 text-avail",
  retard: "bg-quest/10 text-quest",
  panne: "bg-out/10 text-out",
  inconnu: "bg-surface text-fg-muted",
  info: "bg-surface text-fg-muted",
};

const quand = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

// Santé des tâches automatiques : qui les fait (PC, cloud, Supabase), quand elles sont passées, si l'une est en retard.
export function Sante({ taches, maintenantMs }: { taches: TacheSante[]; maintenantMs: number }) {
  const resume = resumeSante(taches);
  return (
    <section className="space-y-2" aria-labelledby="titre-sante">
      <h2 id="titre-sante" className="section-label">Santé des tâches</h2>
      <p className={`rounded-[14px] px-4 py-2.5 text-sm font-semibold ${BANDEAU[resume.niveau]}`}>{resume.texte}</p>
      <ul className="card divide-y divide-line">
        {taches.map((t) => {
          const p = PASTILLE[t.niveau];
          const minutes = t.derniere ? Math.max(0, Math.round((maintenantMs - Date.parse(t.derniere)) / 60000)) : null;
          return (
            <li key={t.id} className="flex items-start gap-3 px-4 py-3">
              <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${p.point}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-fg">{t.titre}</p>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-muted">{t.qui}</span>
                </div>
                <p className="text-[13px] text-fg-muted">
                  {minutes === null ? "Aucun passage enregistré" : `${humanAge(minutes)} (${quand(t.derniere as string)})`}
                  {p.label ? <span className={`font-semibold ${p.texte}`}> · {p.label}</span> : null}
                </p>
                <p className="text-[12px] leading-snug text-fg-muted">{t.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

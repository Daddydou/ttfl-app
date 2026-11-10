// Aides d'affichage pour l'historique des notifications (page Admin > Notifications). Aucune logique métier.

export function libelleSource(source: string): string {
  if (source === "base") return "Base de données";
  if (source === "moteur") return "Moteur";
  if (source === "robot") return "Robot";
  return source;
}

// « 10/11 à 23:28 » en heure de Paris.
export function heureParisCourte(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parties = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Paris",
  }).formatToParts(d);
  const v = (t: string) => parties.find((p) => p.type === t)?.value ?? "";
  return `${v("day")}/${v("month")} à ${v("hour")}:${v("minute")}`;
}

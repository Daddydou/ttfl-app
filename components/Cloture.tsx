"use client";

import { useEffect, useState } from "react";

// « Clôture à 00:00 · dans 2 h 14 » : l'heure de clôture de la soirée (début du premier match, au plus tard minuit),
// enregistrée par le moteur. Recalculé toutes les 30 s ; rien n'est affiché si l'heure est inconnue.
export function texteCloture(clotureIso: string, maintenantMs: number): { texte: string; proche: boolean } | null {
  const t = Date.parse(clotureIso);
  if (Number.isNaN(t)) return null;
  const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(
    new Date(t),
  );
  const reste = Math.round((t - maintenantMs) / 60000);
  if (reste <= 0) return { texte: `Soirée close à ${heure}`, proche: false };
  const h = Math.floor(reste / 60);
  const m = reste % 60;
  const dans = h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
  return { texte: `Clôture à ${heure} · dans ${dans}`, proche: reste <= 60 };
}

export function Cloture({ iso }: { iso: string | null }) {
  const [maintenant, setMaintenant] = useState<number | null>(null);
  useEffect(() => {
    const maj = () => setMaintenant(Date.now());
    maj();
    const id = setInterval(maj, 30000);
    return () => clearInterval(id);
  }, []);
  if (!iso || maintenant === null) return null;
  const c = texteCloture(iso, maintenant);
  if (!c) return null;
  return (
    <span className={`num text-[13px] font-medium ${c.proche ? "text-quest" : "text-fg-muted"}`}>{c.texte}</span>
  );
}

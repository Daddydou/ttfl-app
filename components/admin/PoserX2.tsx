"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { poserX2 } from "@/app/(app)/admin/x2-actions";
import { COMPTES_X2 } from "@/lib/x2";

export interface PickProposable {
  compte: string;
  date: string;
  libelle: string; // « sam. 07/11 · Nom du joueur » (jamais le joueur d'une soirée secrète)
}

// Pose (ou déplace) le x2 du mois sur un pick existant du compte choisi.
export function PoserX2({ picks }: { picks: PickProposable[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [compte, setCompte] = useState("01");
  const proposes = useMemo(() => picks.filter((p) => p.compte === compte), [picks, compte]);
  const [date, setDate] = useState("");
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);

  function poser() {
    setRetour(null);
    start(async () => {
      const res = await poserX2(compte, date);
      setRetour(res.ok ? { ok: true, texte: res.message } : { ok: false, texte: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="space-y-2" aria-labelledby="titre-poser-x2">
      <h2 id="titre-poser-x2" className="section-label">Poser un x2 à la main</h2>
      <div className="card space-y-3 px-4 py-3.5">
        <p className="text-[13px] leading-snug text-fg-muted">
          Choisis un compte puis un de ses picks à venir : le x2 est lié à ce joueur (si le pick change, le x2 saute).
          S&apos;il y a déjà un x2 ce mois-ci pour ce compte, il est déplacé.
        </p>
        <label className="block text-[13px] font-semibold text-fg">
          Compte
          <select className="mt-1 w-full rounded-[10px] bg-fill px-3 py-2 text-[15px] text-fg" value={compte}
            onChange={(e) => { setCompte(e.target.value); setDate(""); }}>
            {COMPTES_X2.map((c) => <option key={c} value={c}>Compte {c}</option>)}
          </select>
        </label>
        <label className="block text-[13px] font-semibold text-fg">
          Soirée
          <select className="mt-1 w-full rounded-[10px] bg-fill px-3 py-2 text-[15px] text-fg" value={date}
            onChange={(e) => setDate(e.target.value)}>
            <option value="">{proposes.length ? "Choisis une soirée…" : "Aucun pick à venir sur ce compte"}</option>
            {proposes.map((p) => <option key={p.date} value={p.date}>{p.libelle}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-primary w-full" disabled={pending || !date} onClick={poser}>
          {pending ? "…" : "Poser le x2"}
        </button>
        {retour && (
          <p className={`rounded-[10px] px-3 py-2 text-[13px] ${retour.ok ? "bg-avail/10 text-avail" : "bg-out/10 text-out"}`}>
            {retour.texte}
          </p>
        )}
      </div>
    </section>
  );
}

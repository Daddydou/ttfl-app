"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export const SEUIL_TIRER = 70; // px de glissement vers le bas pour déclencher le rafraîchissement

// Distance « élastique » affichée : on freine le glissement pour qu'il reste agréable.
export function distanceAffichee(dy: number): number {
  return Math.max(0, Math.min(dy * 0.5, 90));
}

export function doitRafraichir(dy: number): boolean {
  return dy >= SEUIL_TIRER;
}

// Tirer vers le bas en haut de page = recharger les données (router.refresh : pas de rechargement complet).
export function PullToRefresh() {
  const router = useRouter();
  const [dist, setDist] = useState(0);
  const [charge, setCharge] = useState(false);
  const debut = useRef<number | null>(null);

  useEffect(() => {
    function start(e: TouchEvent) {
      debut.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    }
    function move(e: TouchEvent) {
      if (debut.current === null) return;
      const dy = e.touches[0].clientY - debut.current;
      setDist(dy > 0 ? distanceAffichee(dy) : 0);
    }
    function end() {
      if (debut.current !== null && doitRafraichir(dist / 0.5)) {
        setCharge(true);
        router.refresh();
        setTimeout(() => setCharge(false), 900);
      }
      debut.current = null;
      setDist(0);
    }
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, [dist, router]);

  if (dist === 0 && !charge) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center"
      style={{ transform: `translateY(${charge ? 24 : dist}px)`, transition: dist === 0 ? "transform 200ms" : "none" }}
      role="status"
      aria-live="polite"
    >
      <span className="glass rounded-full px-3 py-1 text-[12px] font-semibold text-fg-muted">
        {charge ? "Actualisation…" : doitRafraichir(dist / 0.5) ? "Relâche pour actualiser" : "Tire pour actualiser"}
      </span>
    </div>
  );
}

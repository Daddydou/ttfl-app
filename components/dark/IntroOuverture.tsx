"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * ÉCRAN D'OUVERTURE — façon guide Dark (repris de l'app Tennis) : le nom en
 * capitales fines qui sort du flou, une jauge d'un pixel qui se remplit, puis
 * tout s'efface sur la scène de l'accueil. Une fois par session, à la première
 * arrivée sur l'accueil ; un toucher le passe.
 *
 * Tout le minutage est en CSS (globals.css, « OUVERTURE ») : ce composant ne
 * fait que retenir qu'il a été vu (sessionStorage, lu avant l'affichage par le
 * script de app/layout.tsx) et poser `.intro-vue` sur <html> à la fin.
 */
export function IntroOuverture({ saison }: { saison: string }) {
  const pathname = usePathname();
  const [passee, setPassee] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return;
    try {
      sessionStorage.setItem("intro-vue", "1");
    } catch {
      /* navigation privée : l'ouverture se rejouera, sans gravité */
    }
  }, [pathname]);

  if (pathname !== "/" || passee) return null;

  const terminer = () => {
    document.documentElement.classList.add("intro-vue");
    setPassee(true);
  };

  return (
    <button
      type="button"
      aria-label="Passer l'ouverture"
      onClick={terminer}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) terminer();
      }}
      className="intro-ouverture fixed inset-0 z-[70] flex cursor-default flex-col items-center justify-center gap-8 bg-canvas"
    >
      <span className="titre-espace animate-titre pl-[0.6em] text-[22px] tracking-[0.6em] text-white">TTFL</span>
      <span className="block h-px w-48 bg-white/15" aria-hidden="true">
        <span className="jauge block h-px w-full bg-fg" />
      </span>
      <span className="titre-espace animate-fondu text-[10px] text-fg-muted [animation-delay:400ms]">Saison {saison}</span>
    </button>
  );
}

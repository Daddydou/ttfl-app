"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";

// Invitation à installer l'application sur l'écran d'accueil du téléphone (PWA).
//  - Android / Chrome : un bouton « Installer » qui déclenche l'installation native.
//  - iPhone / iPad (Safari) : pas d'installation par bouton possible, on explique le geste.
//  - Déjà installée (mode standalone) ou invitation refusée : rien ne s'affiche.
const CLE_REFUS = "ttfl:installer-refus";

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function estInstallee(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorIos = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches === true || navigatorIos.standalone === true;
}

export function estAppleMobile(ua: string): boolean {
  return /iphone|ipad|ipod/i.test(ua);
}

function refuse(): boolean {
  try {
    return localStorage.getItem(CLE_REFUS) === "1";
  } catch {
    return false;
  }
}

const sAbonner = () => () => {};

export function InstallerApp() {
  const [evenement, setEvenement] = useState<EvenementInstallation | null>(null);
  const [masquee, setMasquee] = useState(false);
  // Lu côté navigateur uniquement (faux au rendu serveur) : évite un écart d'hydratation.
  const ios = useSyncExternalStore(
    sAbonner,
    () => estAppleMobile(navigator.userAgent) && !estInstallee() && !refuse(),
    () => false,
  );

  useEffect(() => {
    if (estInstallee() || refuse()) return;
    const surInvite = (e: Event) => {
      e.preventDefault();
      setEvenement(e as EvenementInstallation);
    };
    const surInstallee = () => setMasquee(true);
    window.addEventListener("beforeinstallprompt", surInvite);
    window.addEventListener("appinstalled", surInstallee);
    return () => {
      window.removeEventListener("beforeinstallprompt", surInvite);
      window.removeEventListener("appinstalled", surInstallee);
    };
  }, []);

  function masquer() {
    setMasquee(true);
    try {
      localStorage.setItem(CLE_REFUS, "1");
    } catch {
      /* stockage indisponible : l'invitation reviendra, sans gravité */
    }
  }

  async function installer() {
    if (!evenement) return;
    await evenement.prompt();
    const choix = await evenement.userChoice;
    setEvenement(null);
    if (choix.outcome === "accepted") setMasquee(true);
    else masquer();
  }

  if (masquee || (!ios && !evenement)) return null;
  return (
    <section className="card flex items-start gap-3 px-4 py-3" aria-label="Installer l'application">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-fg">Installer TTFL sur ton téléphone</p>
        {ios ? (
          <p className="mt-0.5 text-[13px] text-fg-muted">
            Dans Safari, touche le bouton Partager (le carré avec une flèche), puis « Sur l&apos;écran d&apos;accueil ».
          </p>
        ) : (
          <p className="mt-0.5 text-[13px] text-fg-muted">Elle s&apos;ouvre en plein écran, comme une vraie application.</p>
        )}
        {!ios && evenement && (
          <button type="button" onClick={installer} className="mt-2 text-[15px] font-semibold text-court-400 active:opacity-60">
            Installer
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={masquer}
        aria-label="Masquer"
        className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center text-fg-muted active:opacity-60"
      >
        <Icon name="fermer" size={18} strokeWidth={2} />
      </button>
    </section>
  );
}

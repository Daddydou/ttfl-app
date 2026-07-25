"use client";

import { useEffect } from "react";

// Enregistre le service worker (PWA installable + coquille hors-ligne légère).
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Échec silencieux : l'app fonctionne sans SW, il n'ajoute que
        // l'installabilité et un cache de coquille.
      });
    }
  }, []);
  return null;
}

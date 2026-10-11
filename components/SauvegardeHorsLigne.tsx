"use client";

import { useEffect } from "react";
import { construirePhoto, ecrirePhoto, effacerPhoto } from "@/lib/hors-ligne";

// Écrit la photo du dernier pick du soir dans le navigateur à chaque affichage de l'accueil (en ligne).
export function SauvegardeHorsLigne({
  soiree,
  pickDuSoir,
  aVenir,
}: {
  soiree: string | null;
  pickDuSoir: string | null;
  aVenir: { pick_date: string; player: string }[];
}) {
  const cle = JSON.stringify([soiree, pickDuSoir, aVenir]);
  useEffect(() => {
    ecrirePhoto(construirePhoto({ soiree, pickDuSoir, aVenir }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `cle` résume les trois entrées
  }, [cle]);
  return null;
}

// Rendu sur la page de connexion : se déconnecter efface la photo du navigateur.
export function EffacerHorsLigne() {
  useEffect(() => {
    effacerPhoto();
  }, []);
  return null;
}

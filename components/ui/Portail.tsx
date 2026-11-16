"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const sAbonner = () => () => {};

/**
 * Affiche son contenu directement dans <body>, hors de la page.
 *
 * Pourquoi : les animations d'apparition (`.cascade`, `.animate-page`) créent un
 * « empilement » autour de chaque carte. Une fenêtre `fixed` posée DANS une carte
 * restait coincée derrière les cartes suivantes et la barre du bas. Dans <body>,
 * elle passe toujours au premier plan.
 */
export default function Portail({ children }: { children: React.ReactNode }) {
  const pret = useSyncExternalStore(
    sAbonner,
    () => true,
    () => false,
  );
  return pret ? createPortal(children, document.body) : null;
}

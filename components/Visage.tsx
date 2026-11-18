"use client";

import { useState } from "react";
import { initiales, visageDe } from "@/lib/visages";

// Visage d'un joueur à côté de son nom : photo libre (Wikimedia Commons) si on en a une, sinon ses initiales.
// Si la photo ne charge pas (réseau, fichier retiré), on retombe sur les initiales : jamais d'icône cassée.
// Décoratif (alt vide) : le nom est toujours écrit à côté. À n'utiliser que là où le nom est déjà affiché
// (pick secret du compte 02 : pas de nom affiché = pas de visage).
export function Visage({
  nom,
  taille = 28,
  className = "",
}: {
  nom: string | null | undefined;
  taille?: number;
  className?: string;
}) {
  const [enErreur, setEnErreur] = useState(false);
  if (!nom) return null;
  const visage = enErreur ? null : visageDe(nom);
  const style = { width: taille, height: taille, fontSize: Math.max(9, Math.round(taille * 0.38)) };
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-fill align-middle font-semibold text-fg-muted ring-1 ring-white/10 ${className}`}
      style={style}
      aria-hidden="true"
      data-visage={visage ? "photo" : "initiales"}
    >
      {visage ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniature externe déjà dimensionnée par Commons
        <img
          src={visage.url}
          alt=""
          width={taille}
          height={taille}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-top"
          onError={() => setEnErreur(true)}
        />
      ) : (
        initiales(nom)
      )}
    </span>
  );
}

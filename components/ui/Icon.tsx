import type { SVGProps } from "react";

// Jeu d'icônes maison (trait de 1,8 px, bouts ronds, façon SF Symbols).
// Une seule source : on évite les emojis, dont le rendu change d'un téléphone à l'autre.
const CHEMINS = {
  accueil: (
    <>
      <path d="M3.5 10.6 12 3.5l8.5 7.1" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H9.5v-5.5h5V21h3a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  ballon: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M5.4 5.6c3.2 2.6 3.2 10.2 0 12.8M18.6 5.6c-3.2 2.6-3.2 10.2 0 12.8" />
    </>
  ),
  picks: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2.5" />
      <path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5" />
      <path d="m9 12.5 2 2 4-4.5M9 17.5h6" />
    </>
  ),
  stats: (
    <>
      <path d="M5 20v-8M12 20V4M19 20v-5" />
    </>
  ),
  absents: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  reglages: (
    <>
      <path d="M4 7h8M17 7h3M4 17h3M12 17h8" />
      <circle cx="14.5" cy="7" r="2.5" />
      <circle cx="9.5" cy="17" r="2.5" />
    </>
  ),
  cloche: (
    <>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  sortie: (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  coche: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  fermer: <path d="M6 6l12 12M18 6 6 18" />,
  eclair: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  poubelle: (
    <>
      <path d="M4.5 7h15M10 7V4.5h4V7" />
      <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
} as const;

export type NomIcone = keyof typeof CHEMINS;

export function Icon({
  name,
  size = 24,
  strokeWidth = 1.8,
  ...rest
}: { name: NomIcone; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {CHEMINS[name]}
    </svg>
  );
}

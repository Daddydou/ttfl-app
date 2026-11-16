import Entonnoir from "@/components/dark/Entonnoir";

/**
 * TRANSITION ENTRE LES ÉCRANS (comme l'app Tennis) : un template est recréé à
 * chaque changement de page. Arrivée en fondu qui monte de 10 px ; si l'on
 * vient d'une vignette du menu ou d'un onglet du bas, la page « sort » de ce
 * point (Entonnoir). La barre du haut, le menu et les onglets ne bougent pas.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <Entonnoir>{children}</Entonnoir>;
}

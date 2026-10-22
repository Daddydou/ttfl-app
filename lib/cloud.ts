// Moteur dans le cloud (migration sans PC) : l'interrupteur ttfl_cloud_reglage.mode. Logique pure.

export const MODES_CLOUD = ["off", "simulation", "reel"] as const;
export type ModeCloud = (typeof MODES_CLOUD)[number];

export const LIBELLES_CLOUD: Record<ModeCloud, { titre: string; detail: string }> = {
  off: { titre: "Arrêté", detail: "Seul le PC fait tourner le moteur et le robot." },
  simulation: {
    titre: "Essai à blanc",
    detail: "Le cloud calcule aux mêmes heures que le PC, sans rien écrire ni envoyer. Le PC reste en charge.",
  },
  reel: {
    titre: "Cloud en charge",
    detail: "Le cloud fait tout (projections, Plan 30, picks, contrôles, synchro). Le PC s'arrête de lui-même.",
  },
};

export function lireModeCloud(valeur: unknown): ModeCloud | null {
  return MODES_CLOUD.includes(valeur as ModeCloud) ? (valeur as ModeCloud) : null;
}

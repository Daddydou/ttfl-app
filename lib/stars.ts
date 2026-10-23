// Widget « Stars et date limite » : pour chaque compte, les joueurs déjà pris (donc bloqués par le cycle de 30 jours),
// la date à partir de laquelle chacun redevient pickable et le nombre de soirées restantes dans la saison.
// Logique PURE d'affichage : aucune projection, seulement des dates et des comptages sur les picks déjà enregistrés.

import { JOURS_CYCLE, ajouterJours, joursEntre, normaliserNom } from "@/lib/planning";

// Mêmes dates que ttfl/moteur/config.py (OUVERTURE_SAISON, FIN_SAISON_REGULIERE). À changer à chaque nouvelle saison.
export const OUVERTURE_SAISON = "2026-10-20";
export const FIN_SAISON_REGULIERE = "2027-04-11";

export interface PickStar {
  compte: string;
  player: string;
  pick_date: string; // AAAA-MM-JJ
}

export interface StarBloquee {
  player: string;
  pris_le: string; // dernier pick de ce joueur sur ce compte
  libre_le: string; // premier jour où le joueur peut être repické
  jours_restants: number; // >= 1
  a_venir: boolean; // le pick n'a pas encore eu lieu (déjà posé pour une soirée future)
}

export interface ResumeStars {
  compte: string;
  bloquees: StarBloquee[]; // la plus proche de se libérer d'abord
  prochaine_libre: StarBloquee | null;
  soirees_restantes: number; // d'aujourd'hui (ou de l'ouverture) à la fin de la saison régulière, incluses
  deja_posees: number; // picks déjà posés à partir d'aujourd'hui (inclus)
}

// Nombre de soirées (jours calendaires) à jouer entre aujourd'hui et la fin, incluses. Approximation : certains jours
// n'ont aucun match (pause du All-Star, par exemple).
export function soireesRestantes(aujourdhui: string, fin = FIN_SAISON_REGULIERE, ouverture = OUVERTURE_SAISON): number {
  const depart = aujourdhui < ouverture ? ouverture : aujourdhui;
  if (depart > fin) return 0;
  return joursEntre(depart, fin) + 1;
}

// Règle de l'application (voir bloquesPourSoiree) : deux picks du même joueur à 30 jours ou moins sont refusés, donc le
// joueur est de nouveau permis 31 jours après son dernier pick.
export function starsParCompte(picks: PickStar[], comptes: string[], aujourdhui: string, cycle = JOURS_CYCLE): ResumeStars[] {
  const restantes = soireesRestantes(aujourdhui);
  return comptes.map((compte) => {
    const siens = picks.filter((p) => p.compte === compte);
    const dernierParJoueur = new Map<string, PickStar>();
    for (const p of siens) {
      const cle = normaliserNom(p.player);
      const vu = dernierParJoueur.get(cle);
      if (!vu || p.pick_date > vu.pick_date) dernierParJoueur.set(cle, p);
    }
    const bloquees: StarBloquee[] = [];
    for (const p of dernierParJoueur.values()) {
      const libre = ajouterJours(p.pick_date, cycle + 1);
      const reste = joursEntre(aujourdhui, libre);
      if (reste > 0) {
        bloquees.push({ player: p.player, pris_le: p.pick_date, libre_le: libre, jours_restants: reste, a_venir: p.pick_date > aujourdhui });
      }
    }
    bloquees.sort((a, b) => a.libre_le.localeCompare(b.libre_le) || a.player.localeCompare(b.player));
    return {
      compte,
      bloquees,
      prochaine_libre: bloquees[0] ?? null,
      soirees_restantes: restantes,
      deja_posees: siens.filter((p) => p.pick_date >= aujourdhui).length,
    };
  });
}

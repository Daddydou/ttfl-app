// Alertes déduites de ttfl_robot_etat (comptes rendus déposés par le robot du PC). Logique PURE, sans accès réseau.
import { humanAge } from "@/lib/format";

export interface AlerteSysteme {
  id: string;
  tone: "warn" | "danger" | "info";
  message: string;
}

export interface EtatCookies {
  le?: string;
  total?: number;
  valides?: number;
  echecs?: string[];
}

const AGE_MAX_COOKIES_H = 36; // le contrôle passe chaque matin : au-delà, il a manqué un passage
const SILENCE_PC_MIN = 60; // en dessous, un PC lent ou qui redémarre n'est pas une panne

// Cookies TTFL à renouveler (ou contrôle qui ne passe plus).
export function alerteCookies(etat: EtatCookies | null | undefined, maintenant: number = Date.now()): AlerteSysteme | null {
  if (!etat || !etat.le) return null;
  const echecs = Array.isArray(etat.echecs) ? etat.echecs : [];
  if (echecs.length > 0) {
    return {
      id: "cookies-a-renouveler",
      tone: "danger",
      message: `${echecs.length} cookie(s) TTFL à renouveler : ${echecs.join(", ")}.`,
    };
  }
  const ageH = (maintenant - Date.parse(etat.le)) / 3600000;
  if (Number.isFinite(ageH) && ageH > AGE_MAX_COOKIES_H) {
    return {
      id: "cookies-controle-ancien",
      tone: "warn",
      message: `Le contrôle des cookies n'a pas tourné depuis ${Math.round(ageH)} h.`,
    };
  }
  return null;
}

// Le PC (exécuteur de commandes + robot) ne donne plus signe de vie.
export function alertePcSilencieux(dernierPassage: string | null | undefined, maintenant: number = Date.now()): AlerteSysteme | null {
  if (!dernierPassage) return null; // jamais vu : la page Admin le dit déjà, pas d'alarme sur l'accueil
  const minutes = Math.round((maintenant - Date.parse(dernierPassage)) / 60000);
  if (!Number.isFinite(minutes) || minutes < SILENCE_PC_MIN) return null;
  return {
    id: "pc-silencieux",
    tone: "warn",
    message: `Le PC ne répond plus (${humanAge(minutes)}) : synchro et envois automatiques à l'arrêt.`,
  };
}

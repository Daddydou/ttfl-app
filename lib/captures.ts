// Captures d'écran des picks (ttfl_captures + dossier privé « captures-picks »), posées par le robot du PC.
// Une capture ne vaut que pour le joueur qu'elle montre : si le pick change, elle n'est plus affichée.
import { normaliserNom } from "@/lib/planning";

export interface Capture {
  compte: string;
  pick_date: string;
  joueur: string;
  capture_le: string;
  url: string; // adresse signée (valable 1 h) — le dossier est privé
}

interface LigneCapture {
  compte: string;
  pick_date: string;
  joueur: string;
  capture_le: string;
  chemin: string;
}

// Minimum de ce dont on a besoin du client Supabase (typé large pour rester testable).
interface ClientCaptures {
  from: (t: string) => {
    select: (c: string) => { eq: (k: string, v: string) => PromiseLike<{ data: LigneCapture[] | null; error: unknown }> };
  };
  storage: {
    from: (b: string) => {
      createSignedUrls: (
        chemins: string[],
        secondes: number,
      ) => PromiseLike<{ data: { path: string | null; signedUrl: string }[] | null; error: unknown }>;
    };
  };
}

// Charge toutes les captures existantes (quelques dizaines au plus : seules les soirées à venir sont gardées).
// Ne bloque jamais l'écran : en cas d'erreur (table absente, dossier vide…), renvoie [].
export async function chargerCaptures(supabase: unknown): Promise<Capture[]> {
  try {
    const sb = supabase as ClientCaptures;
    const { data, error } = await sb.from("ttfl_captures").select("compte,pick_date,joueur,capture_le,chemin").eq("mode", "regular");
    if (error || !data || data.length === 0) return [];
    const signees = await sb.storage.from("captures-picks").createSignedUrls(
      data.map((l) => l.chemin),
      3600,
    );
    if (signees.error || !signees.data) return [];
    const urlParChemin = new Map(signees.data.filter((s) => s.path && s.signedUrl).map((s) => [s.path as string, s.signedUrl]));
    return data.flatMap((l) => {
      const url = urlParChemin.get(l.chemin);
      return url ? [{ compte: l.compte, pick_date: String(l.pick_date).slice(0, 10), joueur: l.joueur, capture_le: l.capture_le, url }] : [];
    });
  } catch {
    return [];
  }
}

// La capture d'un pick, seulement si elle montre bien ce joueur.
export function captureDuPick(captures: Capture[] | undefined, compte: string, date: string, joueur: string | null | undefined): Capture | null {
  if (!captures || !joueur) return null;
  const cle = normaliserNom(joueur);
  return captures.find((c) => c.compte === compte && c.pick_date === date && normaliserNom(c.joueur) === cle) ?? null;
}

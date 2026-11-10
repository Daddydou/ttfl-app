// Seul le PROPRIÉTAIRE (le compte TTFL App de Daddy) peut déclencher ce qui sort de la base : secrets GitHub, etc.
// Le projet Supabase est partagé avec d'autres applications et accepte des connexions anonymes :
// « être connecté » ne suffit donc PAS. Même identifiant que les politiques RLS « propriétaire ».
export const ID_PROPRIETAIRE = "fd0b91ef-3a4e-4c0c-8c62-3cb235d77901";

type Utilisateur = { id: string; is_anonymous?: boolean } | null | undefined;

export function estProprietaire(user: Utilisateur): boolean {
  return !!user && !user.is_anonymous && user.id === ID_PROPRIETAIRE;
}

// null = autorisé ; sinon le message à renvoyer (jamais de détail sur l'identifiant attendu).
export function refusNonProprietaire(user: Utilisateur): string | null {
  if (!user) return "Session expirée : reconnecte-toi.";
  if (!estProprietaire(user)) return "Action réservée au propriétaire de l'application.";
  return null;
}

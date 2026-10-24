// Faux client Supabase pour les tests : chaque table renvoie les lignes
// fournies, quelle que soit la chaîne de filtres (.eq, .order, .limit…).
// Suffisant pour tester l'affichage, qui est le seul rôle de l'app.
type Tables = Record<string, unknown[]>;

export function fakeSupabase(tables: Tables) {
  return {
    from(table: string) {
      // La vue ttfl_latest_run se comporte comme ttfl_runs dans ces tests.
      // Pick secret du compte 02 : par défaut ÉTEINT dans les tests (sinon les lignes du 02 seraient masquées). Un test
      // du secret fournit sa propre table ttfl_secret_reglage.
      const parDefaut = table === "ttfl_secret_reglage" ? [{ id: 1, actif: false, compte: "02", profil: "prudent" }] : undefined;
      const rows = tables[table] ?? (table === "ttfl_latest_run" ? tables["ttfl_runs"] : undefined) ?? parDefaut ?? [];
      const result = { data: rows, error: null };
      const single = { data: rows[0] ?? null, error: null };
      const query: Record<string, unknown> = {
        then: (resolve: (v: typeof result) => unknown) => resolve(result),
        maybeSingle: async () => single,
        single: async () => single,
        returns: () => query,
      };
      for (const m of ["select", "eq", "neq", "gt", "gte", "lt", "lte", "in", "order", "limit", "range"]) {
        query[m] = () => query;
      }
      return query;
    },
  };
}

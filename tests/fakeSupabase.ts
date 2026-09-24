// Faux client Supabase pour les tests : chaque table renvoie les lignes
// fournies, quelle que soit la chaîne de filtres (.eq, .order, .limit…).
// Suffisant pour tester l'affichage, qui est le seul rôle de l'app.
type Tables = Record<string, unknown[]>;

export function fakeSupabase(tables: Tables) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const result = { data: rows, error: null };
      const single = { data: rows[0] ?? null, error: null };
      const query: Record<string, unknown> = {
        then: (resolve: (v: typeof result) => unknown) => resolve(result),
        maybeSingle: async () => single,
        single: async () => single,
        returns: () => query,
      };
      for (const m of ["select", "eq", "neq", "gt", "gte", "lt", "lte", "in", "order", "limit"]) {
        query[m] = () => query;
      }
      return query;
    },
  };
}

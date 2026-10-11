// Squelette affiché pendant le chargement serveur d'une page : évite l'écran vide entre deux onglets.
export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Chargement">
      <div className="px-1 pt-2">
        <div className="h-8 w-48 animate-pulse rounded-[10px] bg-surface-2" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-2" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-4">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-surface-2" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

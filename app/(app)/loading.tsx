// Squelette affiché pendant le chargement serveur d'une page : évite l'écran vide entre deux onglets.
// `aria-busy` : l'Entonnoir attend sa disparition pour ouvrir la page depuis le point touché.
// `chargement-racine` : caché pendant qu'une page sort du point lumineux d'une vignette (globals.css).
export default function Loading() {
  return (
    <div className="chargement-racine space-y-4" role="status" aria-label="Chargement" aria-busy="true">
      <div className="flex items-center gap-2 px-1 pt-2 text-[13px] text-fg-muted">
        <span
          aria-hidden="true"
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        <span className="titre-espace text-[11px]">Chargement</span>
      </div>
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-fill/70" />
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

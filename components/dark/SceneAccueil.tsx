import Link from "next/link";
import TerrainDessine from "@/components/dark/TerrainDessine";
import { ajouterJours } from "@/lib/planning";
import { fmtNum } from "@/lib/format";

/**
 * SCÈNE D'OUVERTURE DE L'ACCUEIL — façon écran d'entrée du guide Dark,
 * l'équivalent de la scène de l'app Tennis.
 *
 * Plein écran sur le terrain dessiné (les lignes se tracent une à une) : le
 * pick du soir du compte 01 en grandes capitales fines, une phrase qui dit où
 * en est l'équipe (le chiffre entouré d'un trait, comme les mots-clés du
 * guide), « Continuer » vers les conseillés, et les prochaines soirées sur une
 * ligne fine en bas, chaque soirée un point.
 *
 * LECTURE SEULE : tout vient de la page d'accueil (aucune requête ici). Jamais
 * le compte secret : seul le compte 01 est montré.
 */
const MASQUE = "linear-gradient(to bottom, rgba(0,0,0,.35), black 18%, black 48%, transparent 92%)";

export function SceneAccueil({
  aujourdhui,
  saison,
  titreDate,
  matchCeSoir,
  joueur,
  projection,
  equipe,
  cloture,
  soireesAvecPick,
}: {
  aujourdhui: string;
  saison: string;
  titreDate: string;
  /** Le moteur a calculé une soirée pour aujourd'hui. */
  matchCeSoir: boolean;
  /** Pick du soir du compte 01 (null = pas encore choisi). */
  joueur: string | null;
  projection: number | null;
  equipe: { posees: number; total: number };
  cloture: string | null;
  /** Dates (AAAA-MM-JJ) des soirées à venir où le compte 01 a déjà un pick. */
  soireesAvecPick: string[];
}) {
  // Chorégraphie : chaque élément attend l'écran d'ouverture (`--intro`, 0 s s'il a déjà été vu).
  const apres = (ms: number) => ({ animationDelay: `calc(var(--intro, 0s) + ${ms}ms)` });
  const avecPick = new Set(soireesAvecPick);
  const soirees = Array.from({ length: 10 }, (_, i) => ajouterJours(aujourdhui, i));
  const reste = equipe.total - equipe.posees;
  const heureCloture = cloture
    ? new Date(cloture).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })
    : null;

  return (
    <section
      aria-label="Ce soir"
      data-scene
      className="pleine-largeur relative flex h-[min(72vh,36rem)] min-h-[27rem] flex-col overflow-hidden"
      style={{ marginTop: "calc(-4.25rem - env(safe-area-inset-top))" }}
    >
      {/* Le terrain se fond dans la page par un MASQUE (pas un aplat) : le grain du fond reste continu. */}
      <div
        className="absolute inset-0"
        style={{ maskImage: MASQUE, WebkitMaskImage: MASQUE }}
        aria-hidden="true"
      >
        <TerrainDessine variante="perspective" cadrage="haut" delai="var(--intro, 0s)" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_40%,rgba(0,0,0,.85)_100%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-start gap-4 px-6 pt-[max(6.5rem,15vh)] text-center">
        <p className="titre-espace animate-fondu text-[10px] text-fg/80" style={apres(150)}>
          Saison {saison} · {titreDate}
        </p>
        <h1
          className="animate-titre break-words pl-[0.28em] font-titre text-[28px] font-light uppercase leading-tight tracking-[0.28em] text-white"
          style={apres(300)}
        >
          {matchCeSoir ? (joueur ?? "Ce soir") : "Relâche"}
        </h1>
        <p className="titre-espace animate-fondu text-[10px] text-fg-muted" style={apres(900)}>
          {matchCeSoir
            ? joueur
              ? `Compte 01${projection !== null ? ` · projection ${fmtNum(projection)}` : ""}`
              : "Pick du compte 01 pas encore choisi"
            : "Pas de soirée calculée aujourd'hui"}
        </p>
        {matchCeSoir && (
          <p className="animate-apparition max-w-sm text-[16px] leading-relaxed text-fg/90" style={apres(1100)}>
            {reste === 0 ? (
              <>L&apos;équipe est prête : les {equipe.total} picks sont posés.</>
            ) : (
              <>
                L&apos;équipe : il reste{" "}
                <span className="whitespace-nowrap rounded-[50%] border border-court-500/70 px-3 py-0.5 text-court-400">
                  {reste} pick{reste > 1 ? "s" : ""}
                </span>{" "}
                à poser
                {heureCloture ? <> avant {heureCloture}</> : null}.
              </>
            )}
          </p>
        )}
        <Link
          href="/ce-soir"
          className="titre-espace animate-apparition mt-3 inline-flex min-h-11 items-center pl-[0.5em] text-[15px] tracking-[0.5em] text-white transition hover:text-court-400"
          style={apres(1350)}
        >
          Continuer
        </Link>
      </div>

      {/* Les 10 prochaines soirées, chacune un point (allumé = pick du compte 01 déjà choisi). */}
      <nav aria-label="Prochaines soirées" className="relative mx-auto mb-8 w-full max-w-md px-8">
        <div className="relative h-14">
          <div className="animate-pousse absolute inset-x-0 top-3 h-px origin-left bg-white/40" style={apres(700)} aria-hidden="true" />
          {soirees.map((d, i) => {
            const x = i / (soirees.length - 1);
            const ceSoir = i === 0;
            const pick = avecPick.has(d) || (ceSoir && !!joueur);
            const jour = new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "narrow", timeZone: "UTC" });
            const num = Number(d.slice(8, 10));
            return (
              <Link
                key={d}
                href="/picks"
                aria-label={`Soirée du ${num}${pick ? ", pick choisi" : ", pas encore de pick"}`}
                aria-current={ceSoir ? "date" : undefined}
                className="group absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1.5"
                style={{ left: `${x * 100}%` }}
              >
                <span className="animate-eclore flex h-6 w-6 items-center justify-center" style={apres(800 + i * 90)}>
                  <span
                    className={
                      ceSoir
                        ? "animate-halo h-3 w-3 rounded-full bg-court-500"
                        : pick
                          ? "h-2 w-2 rounded-full bg-fg/85 transition group-hover:h-2.5 group-hover:w-2.5"
                          : "h-1.5 w-1.5 rounded-full bg-white/25 ring-1 ring-white/20 transition group-hover:bg-white/60"
                    }
                  />
                </span>
                <span
                  className={`animate-fondu text-[10px] uppercase tracking-[0.12em] ${ceSoir ? "text-court-400" : "text-fg-muted"}`}
                  style={apres(1000 + i * 90)}
                >
                  {jour}
                  {num}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </section>
  );
}

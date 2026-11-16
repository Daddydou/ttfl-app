import { LoginForm } from "@/components/LoginForm";
import { EffacerHorsLigne } from "@/components/SauvegardeHorsLigne";
import { Icon } from "@/components/ui/Icon";
import TerrainDessine from "@/components/dark/TerrainDessine";

export const metadata = { title: "Connexion â€” TTFL" };

// Connexion, thÃ¨me Â« Dark Â» : le terrain se dessine au fond, le nom en capitales fines espacÃ©es.
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <EffacerHorsLigne />
      {/* Fondu par masque (et non par un aplat) : le grain du fond reste visible jusqu'en bas. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] opacity-70"
        style={{ maskImage: "linear-gradient(to bottom, transparent, black 12%, black 55%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 12%, black 55%, transparent)" }}
        aria-hidden="true"
      >
        <TerrainDessine variante="perspective" cadrage="haut" delai="0s" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="mb-12 text-center">
          <div className="animate-fondu mx-auto mb-6 flex h-16 w-16 items-center justify-center text-fg/90">
            <Icon name="ballon" size={48} strokeWidth={0.9} />
          </div>
          <h1 className="animate-titre pl-[0.6em] font-titre text-[24px] font-light uppercase tracking-[0.6em] text-white">TTFL</h1>
          <p className="titre-espace animate-fondu mt-3 text-[10px] text-fg-muted [animation-delay:500ms]">Le pick du soir</p>
        </div>
        <div className="animate-apparition [animation-delay:700ms]">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

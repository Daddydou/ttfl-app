import { createClient } from "@/lib/supabase/server";
import { aujourdhuiNY } from "@/lib/planning";
import { maintenantMs as heureServeur } from "@/lib/plan30";
import { chargerSecret, soireeSecrete } from "@/lib/secret";
import { lireLignesResumeX2, resumerX2, synthetiser } from "@/lib/x2-resume";
import { X2DuMois } from "@/components/X2DuMois";

// Bloc serveur (à mettre dans un <Suspense>) : x2 du mois de chaque compte. Le pick secret du compte 02 reste masqué.
export async function X2DuMoisBlock() {
  const supabase = await createClient();
  const aujourdhui = aujourdhuiNY();
  const [lignes, secret] = await Promise.all([lireLignesResumeX2(supabase, aujourdhui), chargerSecret(supabase, aujourdhui)]);
  const maintenant = heureServeur();
  const resume = resumerX2(lignes, aujourdhui, (compte, date) => soireeSecrete(secret, compte, date, aujourdhui, maintenant));
  return <X2DuMois resume={resume} synthese={synthetiser(resume, aujourdhui)} />;
}

import { cookies } from "next/headers";
import { COOKIE_ZONE } from "@/lib/planning";

// Dernier compte choisi (cookie posé par le proxy). Hors requête (tests), aucune mémoire : null.
export async function zoneMemorisee(): Promise<string | null> {
  try {
    return (await cookies()).get(COOKIE_ZONE)?.value ?? null;
  } catch {
    return null;
  }
}

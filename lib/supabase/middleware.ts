import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ZONE, zoneChoisie } from "@/lib/planning";

type CookieItem = { name: string; value: string; options?: CookieOptions };

// Rafraîchit la session à chaque requête et protège les routes.
// Toute page hors /login exige un utilisateur connecté (app privée).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieItem[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT : ne rien exécuter entre createServerClient et getClaims(), sinon
  // la session peut ne pas être rafraîchie et l'utilisateur déconnecté au hasard.
  // getClaims() vérifie la signature du jeton EN LOCAL (clés asymétriques ES256 du projet Supabase) : plus d'aller-retour
  // réseau vers Supabase à chaque page (getUser() en faisait un). La session expirée est toujours rafraîchie.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims?.sub ? claimsData.claims : null;

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/login" ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path === "/manifest.webmanifest" ||
    path === "/sw.js";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Compte choisi dans Conseillés / Mes picks : retenu pour le prochain passage (lib/planning.ts).
  const zone = zoneChoisie(request.nextUrl);
  if (zone) response.cookies.set(COOKIE_ZONE, zone, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  return response;
}

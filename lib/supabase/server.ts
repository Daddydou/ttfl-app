import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieItem = { name: string; value: string; options?: CookieOptions };

// Client Supabase côté serveur (composants serveur, server actions, route
// handlers). Lit/écrit la session dans les cookies : les écritures passent
// donc avec l'identité de l'utilisateur connecté, et le RLS s'applique.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : la mutation de cookies y est
            // interdite. Le refresh de session est assuré par le middleware,
            // donc on peut l'ignorer ici.
          }
        },
      },
    },
  );
}

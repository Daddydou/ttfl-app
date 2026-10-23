/** @type {import('next').NextConfig} */
const nextConfig = {
  // libsodium (chiffrement des secrets GitHub, Admin > Cookies) charge un fichier .mjs voisin : on le laisse hors du paquet.
  serverExternalPackages: ["libsodium-wrappers", "libsodium"],
  // Le service worker et le manifest sont servis statiquement depuis /public.
  // On ajoute les en-têtes qui permettent au SW de contrôler toute l'origine.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;

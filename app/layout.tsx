import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

// Inter est la police de texte ; la police système (SF) ne sert plus que de repli.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Fraunces (serif) : grands titres, noms de joueurs et gros chiffres.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: "TTFL — Le pick du soir",
  description: "Le pick TTFL du soir, calculé sur le PC, consulté sur mobile.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TTFL",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

// Pas de maximumScale : le zoom reste possible (accessibilité). Les champs en 16 px évitent le zoom auto d'iOS.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-canvas font-sans antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

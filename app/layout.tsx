import type { Metadata, Viewport } from "next";
import { Inter, Jost } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";
import FondVivant from "@/components/dark/FondVivant";

// Thème « Dark » (repris de l'app Tennis) : Inter pour le texte, Jost fine pour
// les titres en capitales très espacées. Polices auto-hébergées par Next.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-jost", display: "swap" });

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
  themeColor: "#07080a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Lu AVANT l'affichage (rien ne clignote) :
 *  - l'écran d'ouverture déjà vu dans cette session → `.intro-vue` sur <html> ;
 *  - la couleur d'accent choisie dans le menu (essai : balle / or / ballon).
 */
const SCRIPT_AVANT =
  "try{if(sessionStorage.getItem('intro-vue'))document.documentElement.classList.add('intro-vue');var a=localStorage.getItem('ttfl-accent');if(a==='or'||a==='ballon')document.documentElement.dataset.accent=a}catch(e){}";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning : le script ci-dessous peut modifier <html> avant React.
    <html lang="fr" className={`${inter.variable} ${jost.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_AVANT }} />
      </head>
      <body className="min-h-screen overflow-x-clip font-sans antialiased">
        {/* Fibres et poussières qui dérivent derrière tout (canvas fixe, sans clic). */}
        <FondVivant />
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

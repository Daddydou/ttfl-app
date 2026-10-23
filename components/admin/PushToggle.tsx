"use client";

import { useEffect, useState } from "react";
import { VAPID_PUBLIC_KEY, cleVapidEnOctets } from "@/lib/push";
import { enregistrerAbonnement, supprimerAbonnement } from "@/app/(app)/push-actions";

type Etat = "inconnu" | "non_supporte" | "refuse" | "inactif" | "actif";

function supporte(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Active / désactive les notifications push de CET appareil (alertes critiques : pick manquant, joueur Out, cookies...).
// Sur iPhone : l'application doit d'abord être ajoutée à l'écran d'accueil.
export function PushToggle() {
  const [etat, setEtat] = useState<Etat>("inconnu");
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      if (!supporte()) return void (!annule && setEtat("non_supporte"));
      if (Notification.permission === "denied") return void (!annule && setEtat("refuse"));
      try {
        const reg = await navigator.serviceWorker.ready;
        const abo = await reg.pushManager.getSubscription();
        if (!annule) setEtat(abo ? "actif" : "inactif");
      } catch {
        if (!annule) setEtat("inactif");
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  async function activer() {
    setOccupe(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const abo =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: cleVapidEnOctets(VAPID_PUBLIC_KEY) as BufferSource,
        }));
      const json = abo.toJSON();
      const res = await enregistrerAbonnement({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        appareil: navigator.userAgent.slice(0, 120),
      });
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setEtat("actif");
      setMessage("Notifications activées sur cet appareil.");
    } catch {
      setMessage("Activation impossible sur cet appareil.");
    } finally {
      setOccupe(false);
    }
  }

  async function desactiver() {
    setOccupe(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const abo = await reg.pushManager.getSubscription();
      if (abo) {
        await supprimerAbonnement(abo.endpoint);
        await abo.unsubscribe();
      }
      setEtat("inactif");
      setMessage("Notifications désactivées sur cet appareil.");
    } catch {
      setMessage("Désactivation impossible.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <section className="space-y-2" aria-labelledby="titre-push">
      <h2 id="titre-push" className="section-label">Notifications sur ce téléphone</h2>
      <div className="card space-y-2 px-4 py-3 text-[14px]">
        {etat === "inconnu" && <p className="text-fg-muted">Vérification…</p>}
        {etat === "non_supporte" && (
          <p className="text-fg-muted">
            Ce navigateur ne gère pas les notifications. Sur iPhone, ajoute d&apos;abord l&apos;application à l&apos;écran d&apos;accueil, puis rouvre-la depuis l&apos;icône.
          </p>
        )}
        {etat === "refuse" && (
          <p className="text-fg-muted">Notifications refusées : autorise-les dans les réglages du téléphone pour cette application.</p>
        )}
        {(etat === "inactif" || etat === "actif") && (
          <>
            <p className="text-fg-muted">
              {etat === "actif"
                ? "Actives : tu reçois les alertes importantes (pick manquant, joueur Out, cookies, moteur en panne) en plus de ntfy."
                : "Reçois les alertes importantes directement dans l'application, en plus de ntfy."}
            </p>
            <button
              type="button"
              onClick={etat === "actif" ? desactiver : activer}
              disabled={occupe}
              className={`btn btn-sm ${etat === "actif" ? "btn-secondary" : "btn-primary"}`}
            >
              {etat === "actif" ? "Désactiver sur cet appareil" : "Activer les notifications"}
            </button>
          </>
        )}
        {message && <p role="status" className="text-[13px] text-fg-muted">{message}</p>}
      </div>
    </section>
  );
}

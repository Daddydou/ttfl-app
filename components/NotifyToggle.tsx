"use client";

import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";

type Perm = NotificationPermission | "unsupported";

function readPermission(): Perm {
  return "Notification" in window ? Notification.permission : "unsupported";
}

// Pas d'événement fiable de changement de permission partout : le snapshot est
// relu à chaque rendu, et le clic force un rendu via setAsked.
const noopSubscribe = () => () => {};

// Cloche de l'en-tête : demande la permission des notifications (doit venir
// d'un geste utilisateur). Disparaît une fois la réponse donnée.
export function NotifyToggle() {
  const permission = useSyncExternalStore<Perm>(
    noopSubscribe,
    readPermission,
    () => "unsupported",
  );
  const [, setAsked] = useState(false);

  if (permission !== "default") return null;

  return (
    <button
      onClick={() => Notification.requestPermission().finally(() => setAsked(true))}
      aria-label="Activer les notifications de nouvelles projections"
      title="Me prévenir des nouvelles projections"
      className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition active:bg-fill active:text-fg"
    >
      <Icon name="cloche" size={20} />
    </button>
  );
}

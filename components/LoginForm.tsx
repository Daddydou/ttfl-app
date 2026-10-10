"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary mt-2 w-full"
    >
      {pending ? "Connexion…" : "Se connecter"}
    </button>
  );
}

export function LoginForm() {
  const [error, formAction] = useFormState(signIn, null);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-fg-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field w-full !border-line !bg-surface"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-fg-muted">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field w-full !border-line !bg-surface"
        />
      </div>
      {error && (
        <p className="rounded-[12px] bg-out/10 px-3 py-2 text-sm text-out">
          {error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

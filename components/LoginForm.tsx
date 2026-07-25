"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-xl bg-court-500 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
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
        <label htmlFor="email" className="mb-1 block text-sm text-ink-600">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-ink-700 bg-ink-850 px-4 py-3 text-white outline-none focus:border-court-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-ink-600">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-ink-700 bg-ink-850 px-4 py-3 text-white outline-none focus:border-court-500"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-out/10 px-3 py-2 text-sm text-out">
          {error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

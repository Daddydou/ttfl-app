import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Connexion — TTFL" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-court-500 text-3xl shadow-lg shadow-court-600/30">
            🏀
          </div>
          <h1 className="text-2xl font-bold text-white">TTFL</h1>
          <p className="mt-1 text-sm text-ink-600">Le pick du soir</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

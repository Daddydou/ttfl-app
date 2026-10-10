import { LoginForm } from "@/components/LoginForm";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Connexion — TTFL" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[22px] bg-court-500 text-on-accent"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Icon name="ballon" size={44} strokeWidth={1.7} />
          </div>
          <h1 className="title-large">TTFL</h1>
          <p className="subhead mt-1">Le pick du soir</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

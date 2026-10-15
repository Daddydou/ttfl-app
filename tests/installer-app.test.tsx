import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { InstallerApp, estAppleMobile } from "@/components/InstallerApp";

function simulerUA(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
}

afterEach(() => {
  localStorage.clear();
  simulerUA("jsdom");
});

describe("InstallerApp", () => {
  it("reconnaît un iPhone", () => {
    expect(estAppleMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(estAppleMobile("Mozilla/5.0 (Linux; Android 14)")).toBe(false);
  });

  it("sur iPhone : explique le geste Partager > Sur l'écran d'accueil", () => {
    simulerUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    render(<InstallerApp />);
    expect(screen.getByText(/Sur l.écran d.accueil/)).toBeInTheDocument();
  });

  it("sur Android : propose « Installer » quand le navigateur le permet, et se masque une fois refusée", () => {
    render(<InstallerApp />);
    expect(screen.queryByText(/Installer TTFL/)).not.toBeInTheDocument();
    act(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true });
      window.dispatchEvent(e);
    });
    expect(screen.getByRole("button", { name: "Installer" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Masquer" }));
    expect(screen.queryByText(/Installer TTFL/)).not.toBeInTheDocument();
    expect(localStorage.getItem("ttfl:installer-refus")).toBe("1");
  });
});

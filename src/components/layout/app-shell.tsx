"use client";

import { useEffect } from "react";
import { getState, loadWorkspace, restoreFocus, setPaletteOpen } from "@/lib/store/app-store";
import { FocusEngine } from "@/features/focus/components/focus-engine";
import { InstallGuide } from "@/features/install/install-guide";
import { CommandPalette } from "./command-palette";
import { GlobalDialogs } from "./global-dialogs";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Toaster } from "./toaster";
import { MobileTopbar, Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (getState().status === "idle") {
      restoreFocus();
      void loadWorkspace();
    }
  }, []);

  // Avisa antes de fechar a aba com alterações ainda indo para a nuvem.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (getState().pending > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!getState().ui.paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-primary px-3 py-2 font-semibold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <MobileTopbar />
        <main id="conteudo" className="flex-1 pb-28 md:pb-16">
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <GlobalDialogs />
      <Toaster />
      <FocusEngine />
      <InstallGuide />
    </div>
  );
}

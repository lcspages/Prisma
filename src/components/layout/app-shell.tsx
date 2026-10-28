"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getState, loadWorkspace, pushToast, refreshWorkspace, restoreFocus, setPaletteOpen } from "@/lib/store/app-store";
import { FocusEngine } from "@/features/focus/components/focus-engine";
import { InstallGuide } from "@/features/install/install-guide";
import { initPush } from "@/features/notifications/push-client";
import { loadSocial, onSocialNews, requestSocialTab, type SocialTab } from "@/features/social/social-store";
import { CommandPalette } from "./command-palette";
import { GlobalDialogs } from "./global-dialogs";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Toaster } from "./toaster";
import { MobileTopbar, Topbar } from "./topbar";

const NEWS_TAB: Record<"amigo" | "grupo" | "batalha", SocialTab> = { amigo: "amigos", grupo: "grupos", batalha: "batalhas" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (getState().status === "idle") {
      restoreFocus();
      void loadWorkspace();
    }
  }, []);

  // O que foi feito em outro aparelho aparece aqui sem recarregar: confere ao voltar
  // para o app (trocar de aba, desbloquear o celular) e a cada 30 segundos com o app na tela.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void refreshWorkspace();
    };
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  // Lembretes (notificações): prepara o aparelho e confere a inscrição.
  useEffect(() => {
    void initPush();
  }, []);

  // Pedidos de amizade, convites e desafios: confere ao abrir, ao voltar para o app
  // e a cada 20 segundos enquanto o app está na tela (para aparecer sem recarregar).
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DATA_SOURCE === "mock") return;
    const refresh = () => {
      if (document.visibilityState === "visible") void loadSocial({ silent: true });
    };
    // Pedido, convite ou desafio novo: aviso na tela, em qualquer página.
    onSocialNews((news) => {
      const first = news[0];
      pushToast({
        title: news.length > 1 ? `${news.length} novidades em Amigos` : "Novidade em Amigos",
        message: news.length > 1 ? news.map((n) => n.text).join(" · ") : first.text,
        actionLabel: "Ver",
        duration: 10_000,
        onAction: () => {
          requestSocialTab(NEWS_TAB[first.kind]);
          router.push("/amigos");
        },
      });
    });
    refresh();
    const timer = window.setInterval(refresh, 20_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      onSocialNews(null);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [router]);

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
        <main id="conteudo" className="flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-16">
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

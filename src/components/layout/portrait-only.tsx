"use client";

import { useEffect, useState } from "react";
import { LuSmartphone } from "react-icons/lu";

/** Celular (tela de toque pequena) na horizontal. Usa a orientação do aparelho, não o tamanho da janela (o teclado encolhe a janela). */
function isPhoneLandscape() {
  try {
    if (!window.matchMedia("(pointer: coarse)").matches) return false;
    if (Math.min(screen.width, screen.height) >= 600) return false;
    const type = screen.orientation?.type;
    if (type) return type.startsWith("landscape");
    return Math.abs(Number((window as unknown as { orientation?: number }).orientation ?? 0)) === 90;
  } catch {
    return false;
  }
}

/**
 * O Prisma é feito para o celular em pé. Quando o app instalado não trava sozinho (iPhone, navegador),
 * cobrimos a tela na horizontal com um aviso, em vez de abrir o layout de computador.
 */
export function PortraitOnly() {
  const [landscape, setLandscape] = useState(false);

  useEffect(() => {
    const update = () => setLandscape(isPhoneLandscape());
    update();
    // Onde o navegador deixa (app instalado no Android), trava em pé de verdade.
    try {
      void screen.orientation?.lock?.("portrait").catch(() => {});
    } catch {
      /* sem suporte */
    }
    const o = screen.orientation;
    o?.addEventListener?.("change", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    return () => {
      o?.removeEventListener?.("change", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // iPhone: o gesto de pinça dá zoom mesmo com o viewport travado.
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", block);
    document.addEventListener("gesturechange", block);
    return () => {
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
    };
  }, []);

  if (!landscape) return null;
  return (
    <div role="alert" className="fixed inset-0 z-[9999] grid place-items-center bg-canvas p-6 text-center">
      <div>
        <LuSmartphone className="mx-auto size-10 text-primary-ink" aria-hidden />
        <p className="mt-4 text-lead font-semibold text-ink">Vire o celular para ficar em pé</p>
        <p className="mt-1 text-ink-2">O Prisma foi feito para usar na vertical.</p>
      </div>
    </div>
  );
}

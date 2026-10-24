"use client";

import { useEffect, useRef } from "react";
import { pushToast, stopFocus, useAppStore } from "@/lib/store/app-store";
import { playAmbient, playChime, setAmbientVolume, stopAmbient } from "@/lib/audio/ambient";
import { formatTimer } from "@/lib/dates";
import { useTick } from "@/lib/hooks/use-tick";

/**
 * Roda em todas as páginas: termina a sessão quando o tempo acaba
 * (mesmo fora da tela de foco), toca o aviso, mostra o tempo na aba
 * do navegador e mantém o som ambiente tocando entre páginas.
 */
export function FocusEngine() {
  const focus = useAppStore((s) => s.focus);
  const now = useTick(focus.status === "running");
  const baseTitle = useRef<string | null>(null);

  useEffect(() => {
    if (focus.status !== "running" || !focus.endsAt) return;
    if (now >= focus.endsAt) {
      const wasFocus = focus.mode === "focus";
      const resumes = Boolean(focus.resume);
      // O aviso de foco concluído sai junto com o registro da sessão.
      stopFocus({ completed: true });
      playChime();
      if (!wasFocus)
        pushToast({ message: resumes ? "Pausa encerrada. Toque em Continuar foco para seguir de onde parou." : "Pausa encerrada. Pronto para focar?" });
    }
  }, [now, focus.status, focus.endsAt, focus.mode, focus.resume]);

  useEffect(() => {
    const showingTimer = /^\d{1,2}:\d{2}/.test(document.title) && document.title.includes(" · ");
    if (!showingTimer) baseTitle.current = document.title;
    if (focus.status === "running" && focus.endsAt) {
      const label = focus.mode === "focus" ? "Foco" : "Pausa";
      document.title = `${formatTimer((focus.endsAt - now) / 1000)} · ${label}`;
    } else if (showingTimer && baseTitle.current) {
      document.title = baseTitle.current;
    }
  }, [now, focus.status, focus.endsAt, focus.mode]);

  useEffect(() => {
    if (focus.sound === "off") stopAmbient();
    else playAmbient(focus.sound, focus.volume);
  }, [focus.sound, focus.volume]);

  useEffect(() => {
    setAmbientVolume(focus.volume);
  }, [focus.volume]);

  return null;
}

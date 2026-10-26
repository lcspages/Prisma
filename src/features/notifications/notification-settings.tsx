"use client";

import { useEffect, useState } from "react";
import { LuBell, LuBellOff, LuSmartphone, LuX } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { pushToast } from "@/lib/store/app-store";
import { Button } from "@/components/ui/button";
import { openInstallGuide } from "@/features/install/install-guide";
import { disablePush, enablePush, setPushPrefs, testPush, usePush, type PushPrefs } from "./push-client";

const SLOTS: Array<{ key: keyof PushPrefs; label: string; hint: string }> = [
  { key: "manha", label: "Manhã (8h)", hint: "Suas tarefas e hábitos do dia" },
  { key: "noite", label: "Noite (19h)", hint: "O que ainda falta fazer hoje" },
];

/** Cartão do Perfil: ligar/desligar os lembretes, escolher manhã e noite e testar. */
export function NotificationSettings() {
  const { status, prefs, busy } = usePush();
  const [testing, setTesting] = useState(false);

  const enable = async () => {
    const err = await enablePush();
    pushToast({ message: err ?? "Lembretes ativados neste aparelho." });
  };

  const toggle = async (key: keyof PushPrefs) => {
    const err = await setPushPrefs({ ...prefs, [key]: !prefs[key] });
    if (err) pushToast({ message: err });
  };

  return (
    <div>
      {status === "carregando" ? (
        <div className="h-20 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" aria-label="Carregando" />
      ) : status === "sem-suporte" ? (
        <p className="text-ink-2">Este navegador não recebe notificações. No celular, instale o Prisma na tela inicial e abra por lá.</p>
      ) : status === "instalar" ? (
        <div>
          <p className="text-ink-2">No iPhone, os lembretes só chegam com o Prisma instalado na tela inicial. Instale e ative por lá.</p>
          <Button className="mt-3" onClick={openInstallGuide}>
            <LuSmartphone className="size-4" aria-hidden />
            Como instalar
          </Button>
        </div>
      ) : status === "bloqueado" ? (
        <p className="text-ink-2">
          As notificações do Prisma estão bloqueadas neste aparelho. Libere nas configurações do celular (Notificações → Prisma) ou do
          navegador e volte aqui.
        </p>
      ) : status === "desligado" ? (
        <div>
          <p className="text-ink-2">Receba até 2 lembretes por dia com suas tarefas e hábitos.</p>
          <Button variant="primary" className="mt-3" disabled={busy} onClick={enable}>
            <LuBell className="size-4" aria-hidden />
            Ativar lembretes
          </Button>
        </div>
      ) : (
        <div>
          <ul className="space-y-2">
            {SLOTS.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[s.key]}
                  onClick={() => void toggle(s.key)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line px-3 py-2.5 text-left hover:border-line-strong"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{s.label}</span>
                    <span className="block text-meta text-ink-3">{s.hint}</span>
                  </span>
                  <span aria-hidden className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", prefs[s.key] ? "bg-primary" : "bg-line-strong")}>
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]",
                        prefs[s.key] ? "left-[18px]" : "left-0.5",
                      )}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                const err = await testPush();
                setTesting(false);
                pushToast({ message: err ?? "Aviso de teste enviado. Ele chega em alguns segundos." });
              }}
            >
              Enviar um teste
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                await disablePush();
                pushToast({ message: "Lembretes desligados neste aparelho." });
              }}
            >
              <LuBellOff className="size-4" aria-hidden />
              Desligar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const PROMPT_KEY = "prisma:lembretes-convite";

/** Convite na aba Hoje para ligar os lembretes (some ao ativar ou ao fechar). */
export function ReminderPrompt() {
  const { status, busy } = usePush();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(PROMPT_KEY) === "fechado");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden || status !== "desligado") return null;
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(PROMPT_KEY, "fechado");
    } catch {
      /* sem armazenamento */
    }
  };
  return (
    <section aria-label="Lembretes" className="mt-5 flex items-center gap-3 rounded-3xl border border-primary/40 bg-primary-soft p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-on-primary">
        <LuBell className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Quer lembretes do Prisma?</p>
        <p className="text-meta text-ink-2">Até 2 por dia, com suas tarefas e hábitos.</p>
      </div>
      <Button
        size="sm"
        variant="primary"
        disabled={busy}
        onClick={async () => {
          const err = await enablePush();
          pushToast({ message: err ?? "Lembretes ativados. Dá para mudar no Perfil." });
        }}
      >
        Ativar
      </Button>
      <button type="button" onClick={close} aria-label="Fechar convite" className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-surface">
        <LuX className="size-4" aria-hidden />
      </button>
    </section>
  );
}

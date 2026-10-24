"use client";

import { useEffect, useState } from "react";
import { LuX } from "react-icons/lu";
import { openHabitForm } from "@/lib/store/app-store";
import { Button } from "@/components/ui/button";

const KEY = "prisma:welcome-done";

const STEPS = [
  { title: "Crie seus hábitos", body: "Coisas pequenas que você quer repetir. Marque todo dia aqui no topo." },
  { title: "Organize as tarefas", body: "Crie módulos para cada área da vida e coloque tarefas com data e horário." },
  { title: "Foque e acompanhe", body: "Use o timer de foco e veja sua evolução em Relatórios." },
];

/** Explicação rápida do primeiro dia. Some ao tocar em "Entendi". */
export function WelcomeCard() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* sem armazenamento */
    }
  };

  return (
    <section aria-labelledby="welcome-title" className="relative rounded-[28px] border border-accent/60 bg-accent-soft/50 p-6 md:p-7">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar boas-vindas"
        className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink"
      >
        <LuX className="size-4" aria-hidden />
      </button>
      <h2 id="welcome-title" className="text-title font-semibold tracking-[-0.01em] text-ink">
        Como o Prisma funciona
      </h2>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-accent text-meta font-semibold text-on-accent">
              {i + 1}
            </span>
            <span>
              <span className="block font-semibold text-ink">{s.title}</span>
              <span className="text-meta text-ink-2">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => {
            dismiss();
            openHabitForm({});
          }}
        >
          Criar um hábito
        </Button>
        <Button variant="ghost" onClick={dismiss}>
          Entendi
        </Button>
      </div>
    </section>
  );
}

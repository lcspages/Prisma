"use client";

import Link from "next/link";
import { LuCheck, LuClock, LuPlay } from "react-icons/lu";
import type { Module } from "@/types/domain";
import { configureFocus, moveTask, openEditor, toggleTask } from "@/lib/store/app-store";
import { addDaysISO, clockToMinutes, formatDuration, minutesToClock } from "@/lib/dates";
import type { NextPick } from "../lib/pick-next";

function reasonLabel({ task, reason }: NextPick): string {
  switch (reason) {
    case "now": {
      const end = clockToMinutes(task.scheduledTime!) + (task.estimateMin ?? 30);
      return `Agora, até ${minutesToClock(end)}`;
    }
    case "upcoming":
      return `A seguir, às ${task.scheduledTime}`;
    case "overdue":
      return "Atrasada, vale resolver primeiro";
    case "anytime":
      return "A mais importante sem horário";
    case "missed":
      return `Estava marcada para ${task.scheduledTime}`;
  }
}

/**
 * O bloco mais forte da tela: a próxima coisa a fazer, em azul da marca,
 * com a única ação principal da página (Iniciar foco).
 * Texto #141414 sobre o azul: contraste de 6,2:1.
 */
export function NowCard({ pick, module, today }: { pick: NextPick; module?: Module; today: string }) {
  const { task } = pick;
  const subDone = task.subtasks.filter((s) => s.done).length;
  const subTotal = task.subtasks.length;

  return (
    <section
      aria-labelledby="now-title"
      className="relative overflow-hidden rounded-[28px] bg-primary p-6 text-[#141414] md:p-8"
    >
      {/* Brilho decorativo, só no fundo */}
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-white/20 blur-2xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 right-24 size-56 rounded-full bg-[#FFD648]/30 blur-3xl" />

      <div className="relative">
        <p className="flex items-center gap-1.5 text-meta font-semibold">
          <LuClock className="size-3.5" aria-hidden />
          {reasonLabel(pick)}
        </p>

        <button
          type="button"
          onClick={() => openEditor({ taskId: task.id })}
          className="mt-3 block max-w-[640px] text-left"
        >
          <h2 id="now-title" className="text-[26px] font-semibold leading-8 tracking-[-0.02em] md:text-[32px] md:leading-10">
            {task.title}
          </h2>
        </button>

        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[#141414]/75">
          {module && <span>{module.name}</span>}
          {task.estimateMin && <span className="tabular">{formatDuration(task.estimateMin)}</span>}
          {subTotal > 0 && (
            <span className="tabular">
              {subDone} de {subTotal} passos
            </span>
          )}
        </p>

        {subTotal > 0 && (
          <div
            role="progressbar"
            aria-label="Passos concluídos"
            aria-valuemin={0}
            aria-valuemax={subTotal}
            aria-valuenow={subDone}
            className="mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-[#141414]/15"
          >
            <div className="h-full rounded-full bg-[#141414]" style={{ width: `${(subDone / subTotal) * 100}%` }} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href="/foco"
            onClick={() => configureFocus({ taskId: task.id })}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#141414] px-5 font-semibold text-[#F8F8F8] transition-colors hover:bg-[#2a2a2a]"
          >
            <LuPlay className="size-4" aria-hidden />
            Iniciar foco
          </Link>
          <button
            type="button"
            onClick={() => toggleTask(task.id)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/45 px-4 font-semibold transition-colors hover:bg-white/65"
          >
            <LuCheck className="size-4" aria-hidden />
            Concluir
          </button>
          <button
            type="button"
            onClick={() => moveTask(task.id, addDaysISO(today, 1))}
            className="inline-flex h-11 items-center rounded-xl px-3 font-semibold text-[#141414]/80 transition-colors hover:bg-white/25 hover:text-[#141414]"
          >
            Adiar para amanhã
          </button>
        </div>
      </div>
    </section>
  );
}

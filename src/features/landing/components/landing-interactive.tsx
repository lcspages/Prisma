"use client";

import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { LuCalendarCheck, LuCheck, LuDumbbell, LuFlame, LuSparkles, LuTimer, LuTrendingUp } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { PhoneShot, type Shot } from "./phone-shot";
import { BTN_DARK } from "./styles";

/* ------------------------------------------------------------ demo de hábitos */

const DEMO_HABITS = ["Ler 10 páginas", "Beber 2 L de água", "Treinar"];

/** Mini demonstração: a pessoa toca nos hábitos e vê a sequência e os pontos subirem. */
export function HabitDemo({ className }: { className?: string }) {
  const [done, setDone] = useState<boolean[]>(DEMO_HABITS.map(() => false));
  const count = done.filter(Boolean).length;
  const all = count === DEMO_HABITS.length;
  const streak = all ? 8 : 7;

  return (
    <div className={cn("w-full max-w-[400px] rounded-[32px] border border-line bg-surface p-5 shadow-pop sm:p-6", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-ink">Hoje</p>
        <div className="flex items-center gap-3 text-[14px] font-semibold">
          <span className="flex items-center gap-1 text-accent-ink" aria-label={`Sequência de ${streak} dias`}>
            <LuFlame className={cn("size-[18px] transition-transform", all && "scale-125")} aria-hidden />
            <span key={streak} className="landing-pop tabular-nums">
              {streak}
            </span>
          </span>
          <span className="tabular-nums text-ink-2" aria-label={`${count * 10} pontos ganhos hoje`}>
            +{count * 10} XP
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${(count / DEMO_HABITS.length) * 100}%` }} />
      </div>

      <ul className="mt-4 space-y-2.5">
        {DEMO_HABITS.map((name, i) => (
          <li key={name}>
            <button
              type="button"
              aria-pressed={done[i]}
              onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left text-[16px] font-semibold transition-colors",
                done[i] ? "border-primary/50 bg-primary-soft text-ink-2" : "border-line bg-canvas text-ink hover:border-line-strong",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  done[i] ? "border-primary bg-primary text-on-primary" : "border-line-strong",
                )}
              >
                {done[i] && <LuCheck className="size-4" strokeWidth={3} aria-hidden />}
              </span>
              <span className={cn(done[i] && "line-through decoration-2")}>{name}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex h-6 items-center justify-center gap-1.5 text-[14px] font-semibold text-ink-2" aria-live="polite">
        {all ? (
          <span className="landing-pop flex items-center gap-1.5 text-ink">
            <LuSparkles className="size-4 text-accent-ink" aria-hidden />
            Dia completo! 8 dias seguidos.
          </span>
        ) : (
          <span>Toque para marcar</span>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ funções */

const FEATURES: { shot: Shot; name: string; text: string; alt: string; icon: IconType }[] = [
  { shot: "habitos", name: "Hábitos", text: "Um toque marca, a sequência cresce.", alt: "Tela de hábitos do Prisma", icon: LuCalendarCheck },
  { shot: "foco", name: "Foco", text: "Timer de 25, 50 ou 90 min, com sons de fundo.", alt: "Tela de foco do Prisma", icon: LuTimer },
  { shot: "treino", name: "Treino", text: "Carga e repetições, com o seu recorde.", alt: "Tela de treino do Prisma", icon: LuDumbbell },
  { shot: "relatorios", name: "Progresso", text: "Cada coisa feita vira ponto e sobe o nível.", alt: "Tela de progresso do Prisma", icon: LuTrendingUp },
];

/** Cartões das funções: tocar em um troca a tela mostrada no celular. */
export function FeatureShowcase({ phone, cards }: { phone: string; cards: string }) {
  const [active, setActive] = useState(0);

  return (
    <>
      <div className={phone}>
        <div className="grid">
          {FEATURES.map((f, i) => (
            <PhoneShot
              key={f.shot}
              shot={f.shot}
              alt={f.alt}
              className={cn(
                "w-[min(62vw,250px)] [grid-area:1/1] transition-[opacity,transform] duration-500 lg:w-[min(280px,calc((100svh-260px)*0.462))]",
                active === i ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
              )}
            />
          ))}
        </div>
      </div>

      <div className={cards} role="tablist" aria-label="Funções do Prisma">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          const on = active === i;
          return (
            <button
              key={f.shot}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex flex-col items-start rounded-3xl border p-4 text-left transition-[background-color,border-color,box-shadow] sm:p-5",
                on ? "border-primary/40 bg-surface shadow-pop" : "border-line bg-surface/60 hover:bg-surface",
              )}
            >
              <span className={cn("grid size-10 place-items-center rounded-xl transition-colors", on ? "bg-primary text-on-primary" : "bg-primary-soft text-primary-ink")}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="mt-3 text-[16px] font-semibold text-ink sm:text-[17px]">{f.name}</span>
              <span className="mt-1 text-[13px] leading-[19px] text-ink-2 sm:text-[14px] sm:leading-[21px]">{f.text}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------ CTA fixo no celular */

/** Botão fixo no rodapé do celular: aparece quando o botão da abertura sai da tela e some quando os planos estão na tela. */
export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("cta-inicio");
    const plans = document.getElementById("planos");
    if (!hero || !plans) return;
    const seen = { hero: true, plans: false };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) seen.hero = e.isIntersecting;
        if (e.target === plans) seen.plans = e.isIntersecting;
      }
      setShow(!seen.hero && !seen.plans);
    });
    io.observe(hero);
    io.observe(plans);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity] duration-300 lg:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
      aria-hidden={!show}
    >
      <a href="#planos" tabIndex={show ? 0 : -1} className={cn(BTN_DARK, "h-14 w-full text-[16px] shadow-modal")}>
        Quero o Prisma
      </a>
    </div>
  );
}

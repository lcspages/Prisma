"use client";

import { useEffect, useRef, useState } from "react";
import { LuCheck, LuFlame, LuShieldCheck, LuSparkles } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { PRICES } from "@/lib/landing";
import { PhoneShot, type Shot } from "./phone-shot";

/* ------------------------------------------------------------ demo de hábitos */

const DEMO_HABITS = ["Ler 10 páginas", "Beber 2 L de água", "Treinar"];

/** Mini demonstração: a pessoa toca nos hábitos e vê a sequência e os pontos subirem. */
export function HabitDemo() {
  const [done, setDone] = useState<boolean[]>(DEMO_HABITS.map(() => false));
  const count = done.filter(Boolean).length;
  const all = count === DEMO_HABITS.length;
  const streak = all ? 8 : 7;

  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[32px] border border-line bg-surface p-5 shadow-pop">
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

/* ------------------------------------------------------------ telas do app */

const SCREENS: { shot: Shot; tab: string; caption: string; alt: string }[] = [
  { shot: "habitos", tab: "Hábitos", caption: "Um toque marca. A sequência cresce.", alt: "Tela de hábitos do Prisma" },
  { shot: "foco", tab: "Foco", caption: "Timer de 25, 50 ou 90 min, com sons de fundo.", alt: "Tela de foco do Prisma" },
  { shot: "treino", tab: "Treino", caption: "Carga e repetições, com o recorde da última vez.", alt: "Tela de treino do Prisma" },
  { shot: "relatorios", tab: "Progresso", caption: "Cada coisa feita vira ponto e sobe o seu nível.", alt: "Tela de progresso do Prisma" },
];

/** Carrossel das telas: desliza com o dedo ou toca nas abas. */
export function ScreenTour() {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActive(i);
  };

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  return (
    <div>
      <div role="tablist" aria-label="Telas do Prisma" className="mx-auto flex w-full max-w-[420px] rounded-2xl bg-surface-2 p-1">
        {SCREENS.map((s, i) => (
          <button
            key={s.shot}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => go(i)}
            className={cn(
              "h-10 flex-1 rounded-xl text-[14px] font-semibold transition-colors",
              active === i ? "bg-surface text-ink shadow-pop" : "text-ink-2 hover:text-ink",
            )}
          >
            {s.tab}
          </button>
        ))}
      </div>

      <div
        ref={track}
        onScroll={onScroll}
        className="mt-8 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SCREENS.map((s, i) => (
          <figure key={s.shot} className="w-full shrink-0 snap-center px-2" aria-hidden={active !== i}>
            <PhoneShot shot={s.shot} alt={s.alt} className="mx-auto w-[min(66vw,260px)]" />
            <figcaption className="mx-auto mt-6 max-w-[30ch] text-center text-[17px] font-semibold leading-[25px] text-ink">{s.caption}</figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-5 flex justify-center gap-2" aria-hidden>
        {SCREENS.map((s, i) => (
          <span key={s.shot} className={cn("h-1.5 rounded-full transition-all", active === i ? "w-6 bg-primary" : "w-1.5 bg-line-strong")} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ planos */

/** Escolha do plano em um cartão só: alterna entre mensal e vitalício. */
export function PlanPicker({ monthlyUrl, lifetimeUrl }: { monthlyUrl: string; lifetimeUrl: string }) {
  const [plan, setPlan] = useState<"mensal" | "vitalicio">("mensal");
  const monthly = plan === "mensal";
  const url = monthly ? monthlyUrl : lifetimeUrl;

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div role="radiogroup" aria-label="Plano" className="flex rounded-2xl bg-surface-2 p-1">
        {(
          [
            ["mensal", "Mensal"],
            ["vitalicio", "Vitalício"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={plan === id}
            onClick={() => setPlan(id)}
            className={cn("h-11 flex-1 rounded-xl text-[15px] font-semibold transition-colors", plan === id ? "bg-surface text-ink shadow-pop" : "text-ink-2 hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={cn("mt-4 rounded-[32px] p-7 transition-colors", monthly ? "border border-line-strong bg-surface" : "bg-accent text-[#141414]")}>
        <p className="flex items-baseline gap-2">
          <span key={plan} className="landing-pop text-[52px] font-semibold leading-none tracking-[-0.03em]">
            {monthly ? PRICES.mensal : PRICES.vitalicio}
          </span>
          <span className={cn("text-[16px]", monthly ? "text-ink-2" : "text-[#141414]/70")}>{monthly ? "por mês" : "uma vez"}</span>
        </p>
        <p className={cn("mt-3 min-h-[50px] text-[15px] leading-[23px]", monthly ? "text-ink-2" : "text-[#141414]/80")}>
          {monthly ? "Cancele quando quiser." : "Sem mensalidade, enquanto o Prisma estiver em operação."}
        </p>
        {url && (
          <a
            href={url}
            className={cn(
              "mt-5 flex h-14 w-full items-center justify-center rounded-2xl text-[17px] font-semibold transition-[filter,transform] active:translate-y-px",
              monthly ? "bg-primary text-on-primary hover:brightness-95" : "bg-[#141414] text-[#F8F8F8] hover:brightness-125",
            )}
          >
            {monthly ? "Assinar o mensal" : "Comprar o vitalício"}
          </a>
        )}
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-[14px] font-semibold text-ink-2">
        <LuShieldCheck className="size-5 text-primary-ink" aria-hidden />7 dias de garantia ou seu dinheiro de volta
      </p>
    </div>
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
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-300 lg:hidden",
        show ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
      aria-hidden={!show}
    >
      <a href="#planos" tabIndex={show ? 0 : -1} className="flex h-13 w-full items-center justify-center rounded-2xl bg-primary text-[16px] font-semibold text-on-primary">
        Quero o Prisma
      </a>
    </div>
  );
}

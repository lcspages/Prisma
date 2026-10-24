import Image from "next/image";
import Link from "next/link";
import { LuChevronDown } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { CHECKOUT_URL, CHECKOUT_URL_LIFETIME, COMPANY } from "@/lib/legal";
import { LegalLinks } from "@/components/layout/legal-links";
import { PhoneShot } from "./phone-shot";
import { VideoSlot } from "./video-slot";
import { HabitDemo, PlanPicker, ScreenTour, StickyCta } from "./landing-interactive";

const wrap = "mx-auto w-full max-w-5xl px-5 sm:px-8";
const h2 = "text-center text-[28px] font-semibold leading-[34px] tracking-[-0.025em] text-ink sm:text-[36px] sm:leading-[42px]";

/** O que fica para trás: riscado um por um ao abrir a página. */
const SCATTERED = ["Papel", "Lembretes", "Caderno"];

const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: "Preciso baixar alguma coisa?", a: "Não. Abre no navegador do celular ou do computador, com os mesmos dados nos dois." },
  { q: "Como recebo o acesso?", a: "Logo depois da compra chega um e-mail com o link para criar a sua senha." },
  { q: "Posso cancelar o mensal?", a: "Sim, quando quiser, pela Kiwify. O acesso vale até o fim do mês pago." },
  {
    q: "O que é o vitalício?",
    a: (
      <>
        Você paga uma vez e usa enquanto o Prisma estiver em operação. Se um dia ele for encerrado, avisamos no app com 30 dias de antecedência.{" "}
        <Link href="/termos" className="font-semibold text-primary-ink underline underline-offset-2">
          Termos de uso
        </Link>
      </>
    ),
  },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink">
      <header className={cn(wrap, "flex h-16 items-center justify-between")}>
        <Link href="/" className="flex items-center gap-2.5" aria-label="Prisma, página inicial">
          <Image src="/logo-prisma.png" alt="" width={34} height={34} className="rounded-[22%]" priority />
          <span className="text-[18px] font-semibold tracking-[-0.01em]">Prisma</span>
        </Link>
        <Link href="/login" className="rounded-xl px-3.5 py-2 text-[15px] font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink">
          Entrar
        </Link>
      </header>

      <main>
        {/* Abertura */}
        <section id="inicio" className={cn(wrap, "pb-14 pt-6 text-center lg:pb-20 lg:pt-10")}>
          <ul aria-label="O que fica para trás" className="flex flex-wrap justify-center gap-2">
            {SCATTERED.map((item, i) => (
              <li key={item} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[14px] font-semibold text-ink-3">
                <span className="landing-strike" style={{ "--d": `${300 + i * 240}ms` } as React.CSSProperties}>
                  {item}
                </span>
              </li>
            ))}
          </ul>
          <h1 className="mx-auto mt-6 max-w-[12ch] text-[44px] font-semibold leading-[46px] tracking-[-0.04em] sm:text-[64px] sm:leading-[64px]">
            Sua rotina num lugar só.
          </h1>
          <p className="mx-auto mt-4 max-w-[30ch] text-[17px] leading-[26px] text-ink-2">Hábitos, tarefas, foco e treino. Abre no navegador, sem baixar nada.</p>
          <a
            id="cta-inicio"
            href="#planos"
            className="mt-7 inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-8 text-[17px] font-semibold text-on-primary transition-[filter,transform] hover:brightness-95 active:translate-y-px"
          >
            Quero o Prisma
          </a>
          <PhoneShot shot="hoje" priority alt="Tela inicial do Prisma" className="mx-auto mt-12 w-[min(72vw,290px)]" />
        </section>

        {/* Experimente */}
        <section aria-labelledby="experimente" className="bg-surface-2/60 py-14 lg:py-20">
          <div className={wrap}>
            <h2 id="experimente" className={h2}>
              Experimente
            </h2>
            <div className="mt-8">
              <HabitDemo />
            </div>
          </div>
        </section>

        {/* Telas */}
        <section aria-labelledby="telas" className="py-14 lg:py-20">
          <div className={wrap}>
            <h2 id="telas" className={cn(h2, "mb-8")}>
              Tudo do seu dia
            </h2>
            <ScreenTour />
          </div>
        </section>

        <VideoSlot />

        {/* Planos */}
        <section id="planos" aria-labelledby="planos-titulo" className="scroll-mt-4 bg-surface-2/60 py-14 lg:py-20">
          <div className={wrap}>
            <h2 id="planos-titulo" className={cn(h2, "mb-8")}>
              Escolha seu plano
            </h2>
            <PlanPicker monthlyUrl={CHECKOUT_URL} lifetimeUrl={CHECKOUT_URL_LIFETIME} />
          </div>
        </section>

        {/* Dúvidas */}
        <section aria-labelledby="duvidas" className="py-14 lg:py-20">
          <div className={cn(wrap, "max-w-[620px]")}>
            <h2 id="duvidas" className={cn(h2, "mb-6")}>
              Dúvidas
            </h2>
            <div className="border-t border-line">
              {FAQ.map((item) => (
                <details key={item.q} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4.5 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <LuChevronDown className="size-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="-mt-1 pb-5 pr-8 text-[15px] leading-[23px] text-ink-2">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className={cn(wrap, "flex flex-col items-center gap-3 pb-28 pt-4 text-center lg:pb-12")}>
        <a href={`mailto:${COMPANY.email}`} className="text-[13px] text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline">
          {COMPANY.email}
        </a>
        <LegalLinks className="text-[12px]" />
      </footer>

      <StickyCta />
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { LuChevronDown, LuLogIn } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { CHECKOUT_URL, CHECKOUT_URL_LIFETIME, COMPANY } from "@/lib/legal";
import { LegalLinks } from "@/components/layout/legal-links";
import { PhoneShot } from "./phone-shot";
import { VideoSlot } from "./video-slot";
import { HabitDemo, PlanPicker, ScreenTour, StickyCta } from "./landing-interactive";
import { PHONE_DESKTOP_LG, SCREEN, TITLE } from "./styles";

const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12";

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
      {/* Topo fixo */}
      <header className="sticky top-0 z-30 border-b border-transparent bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
        <div className={cn(wrap, "flex h-16 items-center justify-between")}>
          <Link href="/" className="flex items-center gap-2.5" aria-label="Prisma, página inicial">
            <Image src="/logo-prisma.png" alt="" width={34} height={34} className="rounded-[22%]" priority />
            <span className="text-[18px] font-semibold tracking-[-0.01em]">Prisma</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <a
              href="#planos"
              className="hidden h-10 items-center rounded-full px-4 text-[15px] font-semibold text-ink-2 transition-colors hover:text-ink lg:inline-flex"
            >
              Planos
            </a>
            <Link
              href="/login"
              className="group inline-flex h-10 items-center gap-2 rounded-full border border-primary/30 bg-primary-soft pl-3.5 pr-4 text-[15px] font-semibold text-primary-ink transition-colors hover:border-primary hover:bg-primary hover:text-on-primary"
            >
              <LuLogIn className="size-[18px] transition-transform group-hover:translate-x-0.5" aria-hidden />
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Abertura */}
        <section id="inicio" className={cn(SCREEN, "lg:py-8")}>
          <div className={cn(wrap, "pb-14 pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:pb-0 lg:pt-0")}>
            <div className="text-center lg:text-left">
              <ul aria-label="O que fica para trás" className="flex flex-wrap justify-center gap-2 lg:justify-start">
                {SCATTERED.map((item, i) => (
                  <li key={item} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[14px] font-semibold text-ink-3">
                    <span className="landing-strike" style={{ "--d": `${300 + i * 240}ms` } as React.CSSProperties}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <h1 className="mx-auto mt-6 max-w-[12ch] text-[44px] font-semibold leading-[46px] tracking-[-0.04em] sm:text-[64px] sm:leading-[64px] lg:mx-0 lg:text-[76px] lg:leading-[76px]">
                Sua rotina num lugar só.
              </h1>
              <p className="mx-auto mt-4 max-w-[30ch] text-[17px] leading-[26px] text-ink-2 lg:mx-0 lg:mt-6 lg:max-w-[36ch] lg:text-[20px] lg:leading-[30px]">
                Hábitos, tarefas, foco e treino. Abre no navegador, sem baixar nada.
              </p>
              <a
                id="cta-inicio"
                href="#planos"
                className="mt-7 inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-8 text-[17px] font-semibold text-on-primary transition-[filter,transform] hover:brightness-95 active:translate-y-px lg:mt-9 lg:h-15 lg:px-10 lg:text-[18px]"
              >
                Quero o Prisma
              </a>
            </div>
            <PhoneShot shot="hoje" priority alt="Tela inicial do Prisma" className={cn("mx-auto mt-12 w-[min(72vw,290px)] lg:mt-0", PHONE_DESKTOP_LG)} />
          </div>
        </section>

        {/* Experimente */}
        <section aria-labelledby="experimente" className={cn(SCREEN, "bg-surface-2/60 py-14")}>
          <div className={cn(wrap, "lg:grid lg:grid-cols-2 lg:items-center lg:gap-16")}>
            <div className="text-center lg:text-left">
              <h2 id="experimente" className={TITLE}>
                Experimente
              </h2>
              <p className="mt-3 hidden max-w-[30ch] text-[20px] leading-[30px] text-ink-2 lg:block">Toque nos hábitos e veja a sequência e os pontos subirem.</p>
            </div>
            <div className="mt-8 lg:mt-0">
              <HabitDemo />
            </div>
          </div>
        </section>

        {/* Telas */}
        <section aria-label="Telas do Prisma" className={cn(SCREEN, "py-14")}>
          <div className={wrap}>
            <ScreenTour title="Tudo do seu dia" />
          </div>
        </section>

        <VideoSlot />

        {/* Planos */}
        <section id="planos" aria-labelledby="planos-titulo" className={cn(SCREEN, "scroll-mt-16 bg-surface-2/60 py-14")}>
          <div className={cn(wrap, "lg:grid lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] lg:items-center lg:gap-14")}>
            <div className="text-center lg:text-left">
              <h2 id="planos-titulo" className={TITLE}>
                Escolha seu plano
              </h2>
              <p className="mt-3 hidden max-w-[28ch] text-[20px] leading-[30px] text-ink-2 lg:block">Os dois têm tudo o que o Prisma faz.</p>
            </div>
            <div className="mt-8 lg:mt-0">
              <PlanPicker monthlyUrl={CHECKOUT_URL} lifetimeUrl={CHECKOUT_URL_LIFETIME} />
            </div>
          </div>
        </section>

        {/* Dúvidas */}
        <section aria-labelledby="duvidas" className="py-14 lg:py-24">
          <div className={cn(wrap, "max-w-[620px] lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-16")}>
            <div className="text-center lg:text-left">
              <h2 id="duvidas" className={TITLE}>
                Dúvidas
              </h2>
              <a
                href={`mailto:${COMPANY.email}`}
                className="mt-3 hidden text-[16px] font-semibold text-primary-ink underline-offset-2 hover:underline lg:inline-block"
              >
                {COMPANY.email}
              </a>
            </div>
            <div className="mt-6 border-t border-line lg:mt-0">
              {FAQ.map((item) => (
                <details key={item.q} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4.5 text-[16px] font-semibold lg:py-5 lg:text-[17px] [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <LuChevronDown className="size-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="-mt-1 pb-5 pr-8 text-[15px] leading-[23px] text-ink-2 lg:text-[16px] lg:leading-[25px]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={cn(wrap, "flex flex-col items-center gap-3 pb-28 pt-8 text-center lg:flex-row lg:justify-between lg:pb-8 lg:text-left")}>
          <a href={`mailto:${COMPANY.email}`} className="text-[13px] text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline">
            {COMPANY.email}
          </a>
          <LegalLinks className="text-[12px]" />
        </div>
      </footer>

      <StickyCta />
    </div>
  );
}

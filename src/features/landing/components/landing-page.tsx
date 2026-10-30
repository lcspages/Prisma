import Image from "next/image";
import Link from "next/link";
import { LuChevronDown, LuFlame, LuLogIn, LuShieldCheck, LuTimer } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { CHECKOUT_URL, CHECKOUT_URL_LIFETIME, COMPANY } from "@/lib/legal";
import { PRICES } from "@/lib/landing";
import { LegalLinks } from "@/components/layout/legal-links";
import { DesktopShot, PhoneShot } from "./phone-shot";
import { Sky } from "./sky";
import { VideoSlot } from "./video-slot";
import { FeatureShowcase, HabitDemo, HeaderShell } from "./landing-interactive";
import { BTN_DARK, BTN_GLASS, GLASS, SCREEN, TITLE, WRAP } from "./styles";

const NAV = [
  ["#funcoes", "Funções"],
  ["#planos", "Planos"],
  ["#duvidas", "Dúvidas"],
] as const;

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

/* ------------------------------------------------------------ peças */

function Header() {
  return (
    <HeaderShell>
      <div className={cn(GLASS, "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full pl-3 pr-2 sm:pl-4")}>
        <Link href="/" className="flex items-center gap-2" aria-label="Prisma, página inicial">
          <Image src="/logo-prisma.png" alt="" width={32} height={32} className="rounded-[22%]" priority />
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Prisma</span>
        </Link>
        <nav aria-label="Seções" className="hidden items-center gap-1 lg:flex">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-4 py-2 text-[15px] font-medium text-ink-2 transition-colors hover:bg-white/60 hover:text-ink dark:hover:bg-white/10">
              {label}
            </a>
          ))}
        </nav>
        <Link href="/login" className={cn(BTN_DARK, "group h-10 px-5 text-[15px]")}>
          <LuLogIn className="size-[17px] transition-transform group-hover:translate-x-0.5" aria-hidden />
          Entrar
        </Link>
      </div>
    </HeaderShell>
  );
}

/** Cartõezinhos de vidro com números do app, flutuando ao redor do celular da abertura. */
function HeroWidgets() {
  const card = cn(GLASS, "landing-float absolute rounded-2xl px-3.5 py-3 text-left");
  return (
    <>
      <div className={cn(card, "-left-6 top-[16%] sm:-left-16")} style={{ "--fd": "0s" } as React.CSSProperties}>
        <p className="text-[11px] font-medium text-ink-2">Sequência</p>
        <p className="mt-0.5 flex items-center gap-1 text-[18px] font-semibold text-ink">
          <LuFlame className="size-[18px] text-accent-ink" aria-hidden />
          23 dias
        </p>
      </div>
      <div className={cn(card, "-right-6 top-[38%] flex items-center gap-2.5 sm:-right-16")} style={{ "--fd": "-2s" } as React.CSSProperties}>
        <svg viewBox="0 0 36 36" className="size-9 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-primary/20" />
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset="33" className="stroke-primary" />
        </svg>
        <div>
          <p className="text-[11px] font-medium text-ink-2">Foco hoje</p>
          <p className="flex items-center gap-1 text-[16px] font-semibold text-ink">
            <LuTimer className="size-4 text-primary-ink" aria-hidden />
            1h25
          </p>
        </div>
      </div>
      <div className={cn(card, "-left-16 bottom-[30%] hidden w-[170px] sm:block")} style={{ "--fd": "-4s" } as React.CSSProperties}>
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-ink">Nível 7</p>
          <p className="text-[11px] text-ink-2">321 / 450 XP</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent/25">
          <div className="h-full w-[71%] rounded-full bg-accent" />
        </div>
      </div>
    </>
  );
}

function PlanCard({ plan }: { plan: "mensal" | "vitalicio" }) {
  const monthly = plan === "mensal";
  const url = monthly ? CHECKOUT_URL : CHECKOUT_URL_LIFETIME;
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-semibold text-ink">{monthly ? "Mensal" : "Vitalício"}</p>
        {!monthly && <span className="rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-[#141414]">Pague uma vez</span>}
      </div>
      <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
        <span className="whitespace-nowrap text-[52px] font-light leading-none tracking-[-0.04em] text-ink lg:text-[60px]">{monthly ? PRICES.mensal : PRICES.vitalicio}</span>
        <span className="text-[15px] text-ink-2">{monthly ? "por mês" : "uma vez"}</span>
      </p>
      <p className="mt-3 min-h-[46px] text-[15px] leading-[23px] text-ink-2">
        {monthly ? "Renova todo mês. Cancele quando quiser." : "Sem mensalidade, enquanto o Prisma estiver em operação."}
      </p>
      {url && (
        <a
          href={url}
          className={cn(
            "mt-6 h-13 w-full text-[16px]",
            monthly
              ? "inline-flex items-center justify-center rounded-full bg-primary font-semibold text-on-primary transition-[filter,transform] hover:brightness-95 active:translate-y-px"
              : BTN_DARK,
          )}
        >
          {monthly ? "Assinar o mensal" : "Comprar o vitalício"}
        </a>
      )}
    </>
  );
  return monthly ? (
    <div className="rounded-[32px] border border-line bg-surface p-7 shadow-pop lg:p-8">{body}</div>
  ) : (
    <Sky className="rounded-[32px] shadow-pop">
      <div className="h-full bg-white/45 p-7 backdrop-blur-[2px] lg:p-8 dark:bg-black/35">{body}</div>
    </Sky>
  );
}

/* ------------------------------------------------------------ página */

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink">
      <Header />

      <main>
        {/* Abertura no céu */}
        <section id="inicio" className="p-2 sm:p-3">
          <Sky priority className="rounded-[28px] lg:h-[calc(100svh-24px)] lg:min-h-[640px] lg:rounded-[40px]">
            <div className={cn(WRAP, "grid h-full items-center gap-8 pt-28 lg:content-start lg:gap-12 lg:pt-32")}>
              <div className="text-center">
                <h1 className="mx-auto max-w-[11ch] text-[48px] font-light leading-[50px] tracking-[-0.045em] text-ink sm:text-[68px] sm:leading-[68px] lg:max-w-none lg:text-[76px] lg:leading-[80px]">
                  Sua rotina num lugar só.
                </h1>
                <p className="mx-auto mt-5 max-w-[30ch] text-[17px] leading-[26px] text-ink/75 lg:mt-5 lg:max-w-none lg:text-[19px] lg:leading-[29px]">
                  Hábitos, tarefas, foco e treino. Abre no navegador, sem baixar nada.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 lg:gap-3">
                  <a id="cta-inicio" href="#planos" className={cn(BTN_DARK, "h-13 px-6 text-[15px] sm:h-14 sm:px-8 sm:text-[16px]")}>
                    Quero o Prisma
                  </a>
                  <a href="#funcoes" className={cn(BTN_GLASS, "h-13 px-6 text-[15px] sm:h-14 sm:px-7 sm:text-[16px]")}>
                    Ver funções
                  </a>
                </div>
              </div>

              <div className="relative mx-auto -mb-28 w-[min(70vw,280px)] self-end sm:-mb-36 lg:hidden">
                <PhoneShot shot="hoje" priority alt="Tela inicial do Prisma" className="w-full" />
                <HeroWidgets />
              </div>

              {/* Computador: a janela do app embaixo do texto, saindo pela borda de baixo */}
              <div className="hidden justify-center lg:flex">
                <DesktopShot shot="hoje" priority alt="Tela inicial do Prisma no computador" className="w-[min(100%,1040px)]" />
              </div>
            </div>
          </Sky>
        </section>

        {/* Fundo com degradê leve entre as seções (do fim da abertura até antes da chamada final) */}
        <div className="landing-glow">
        {/* Frase central */}
        <section className="py-20 text-center lg:py-32">
          <div className={WRAP}>
            <div aria-hidden className="relative mx-auto size-28 lg:size-36">
              <div className="absolute inset-0 rounded-full bg-primary/60 blur-2xl" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#8cc6ff] to-primary blur-md" />
            </div>
            <p className="mx-auto mt-10 max-w-[24ch] text-[28px] font-light leading-[38px] tracking-[-0.02em] text-ink sm:text-[38px] sm:leading-[50px] lg:text-[46px] lg:leading-[60px]">
              Do hábito ao treino, organizar a rotina ficou simples.
            </p>
          </div>
        </section>

        {/* Funções */}
        <section id="funcoes" aria-labelledby="funcoes-titulo" className={cn(SCREEN, "scroll-mt-20 pb-20")}>
          <div className={cn(WRAP, "grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-x-16 lg:gap-y-8")}>
            <div className="text-center lg:col-start-2 lg:self-end lg:text-left">
              <h2 id="funcoes-titulo" className={TITLE}>
                Feito para o seu dia.
              </h2>
              <p className="mx-auto mt-3 max-w-[30ch] text-[16px] leading-[25px] text-ink-2 lg:mx-0 lg:text-[18px] lg:leading-[28px]">Toque em uma função para ver a tela.</p>
            </div>
            <FeatureShowcase
              phone="flex justify-center lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:justify-end"
              cards="grid grid-cols-2 gap-3 lg:col-start-2 lg:self-start lg:gap-4"
            />
          </div>
        </section>

        {/* Experimente */}
        <section aria-labelledby="experimente" className="py-10 lg:py-16">
          <div className={WRAP}>
            <Sky className="rounded-[32px] lg:rounded-[40px]">
              <div className="grid items-center gap-10 px-5 py-14 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:px-16 lg:py-20">
                <div className="text-center lg:text-left">
                  <h2 id="experimente" className={TITLE}>
                    Experimente.
                  </h2>
                  <p className="mx-auto mt-3 max-w-[28ch] text-[16px] leading-[25px] text-ink/75 lg:mx-0 lg:text-[18px] lg:leading-[28px]">
                    Marque os hábitos e veja a sequência subir.
                  </p>
                </div>
                <HabitDemo className="mx-auto lg:mx-0 lg:justify-self-end" />
              </div>
            </Sky>
          </div>
        </section>

        <VideoSlot />

        {/* Planos */}
        <section id="planos" aria-labelledby="planos-titulo" className="scroll-mt-20 py-16 lg:py-24">
          <div className={WRAP}>
            <h2 id="planos-titulo" className={cn(TITLE, "text-center")}>
              Escolha seu plano.
            </h2>
            <div className="mx-auto mt-10 grid max-w-[880px] gap-4 lg:mt-14 lg:grid-cols-2 lg:gap-6">
              <PlanCard plan="mensal" />
              <PlanCard plan="vitalicio" />
            </div>
            <p className="mt-7 flex items-center justify-center gap-2 text-[14px] font-semibold text-ink-2">
              <LuShieldCheck className="size-5 text-primary-ink" aria-hidden />7 dias de garantia ou seu dinheiro de volta
            </p>
          </div>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" aria-labelledby="duvidas-titulo" className="scroll-mt-20 py-16 lg:py-24">
          <div className={cn(WRAP, "max-w-[720px]")}>
            <h2 id="duvidas-titulo" className={cn(TITLE, "text-center")}>
              Dúvidas.
            </h2>
            <div className="mt-8 space-y-3">
              {FAQ.map((item) => (
                <details key={item.q} className="group rounded-3xl border border-line bg-surface px-5 open:shadow-pop">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4.5 text-[16px] font-semibold lg:text-[17px] [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <LuChevronDown className="size-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="-mt-1 pb-5 pr-6 text-[15px] leading-[23px] text-ink-2 lg:text-[16px] lg:leading-[25px]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        </div>

        {/* Chamada final no céu */}
        <section className="p-2 sm:p-3">
          <Sky className="rounded-[28px] lg:rounded-[40px]">
            <div className={cn(WRAP, "pt-16 text-center lg:pt-24")}>
              <h2 className={cn(TITLE, "mx-auto max-w-[16ch]")}>Comece hoje a organizar sua rotina.</h2>
              <a href="#planos" className={cn(BTN_DARK, "mt-8 h-14 px-8 text-[16px]")}>
                Quero o Prisma
              </a>
              <div className="mx-auto mt-12 h-[260px] w-[min(62vw,260px)] overflow-hidden lg:hidden">
                <PhoneShot shot="foco" alt="Tela de foco do Prisma" className="w-full" />
              </div>
              <div className="mx-auto mt-16 hidden h-[340px] w-[min(80vw,820px)] overflow-hidden lg:block">
                <DesktopShot shot="foco" alt="Tela de foco do Prisma no computador" className="w-full" />
              </div>
            </div>
          </Sky>
        </section>
      </main>

      <footer className={cn(WRAP, "flex flex-col items-center gap-3 pb-10 pt-8 text-center lg:flex-row lg:justify-between lg:text-left")}>
        <a href={`mailto:${COMPANY.email}`} className="text-[13px] text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline">
          {COMPANY.email}
        </a>
        <LegalLinks className="text-[12px]" />
      </footer>

    </div>
  );
}

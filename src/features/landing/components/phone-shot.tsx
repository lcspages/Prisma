import Image from "next/image";
import { cn } from "@/lib/cn";

export type Shot = "hoje" | "habitos" | "foco" | "treino" | "relatorios";

/** Print real do app dentro de uma moldura de celular (troca para o print escuro no tema escuro). */
export function PhoneShot({ shot, alt, priority, className }: { shot: Shot; alt: string; priority?: boolean; className?: string }) {
  const img = "block h-auto w-full";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[38px] border-[7px] border-[#141414] bg-[#141414] shadow-modal dark:border-[#2c2c2c]",
        className,
      )}
    >
      <Image src={`/landing/${shot}.webp`} alt={alt} width={780} height={1688} priority={priority} sizes="(min-width: 1024px) 320px, 70vw" className={cn(img, "dark:hidden")} />
      <Image src={`/landing/${shot}-dark.webp`} alt={alt} width={780} height={1688} sizes="(min-width: 1024px) 320px, 70vw" className={cn(img, "hidden dark:block")} />
    </div>
  );
}

/** Print da versão de computador dentro de uma janela de navegador (troca para o print escuro no tema escuro). */
export function DesktopShot({ shot, alt, priority, className }: { shot: Shot; alt: string; priority?: boolean; className?: string }) {
  const img = "block h-auto w-full";
  return (
    <div className={cn("overflow-hidden rounded-[18px] border border-black/10 bg-[#ececec] shadow-modal dark:border-white/10 dark:bg-[#232323]", className)}>
      <div aria-hidden className="flex h-8 items-center gap-1.5 px-3.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto rounded-md bg-black/5 px-10 py-0.5 text-[10px] text-black/45 dark:bg-white/10 dark:text-white/45">prismarotina.com.br</span>
        <span className="w-[42px]" />
      </div>
      <Image src={`/landing/pc-${shot}.webp`} alt={alt} width={1440} height={900} priority={priority} sizes="(min-width: 1024px) 1040px, 100vw" className={cn(img, "dark:hidden")} />
      <Image src={`/landing/pc-${shot}-dark.webp`} alt={alt} width={1440} height={900} sizes="(min-width: 1024px) 1040px, 100vw" className={cn(img, "hidden dark:block")} />
    </div>
  );
}

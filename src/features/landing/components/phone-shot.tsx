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

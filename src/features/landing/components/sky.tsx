import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Bloco com o céu de fundo e um véu claro por cima (escuro no tema escuro),
 * para o texto ficar legível e o céu ficar suave.
 */
export function Sky({ children, className, priority }: { children: React.ReactNode; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <Image src="/landing/ceu.webp" alt="" fill priority={priority} sizes="100vw" className="-z-20 object-cover" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[#F8F8F8]/65 via-[#F8F8F8]/35 to-[#F8F8F8]/80 dark:from-[#141414]/80 dark:via-[#141414]/55 dark:to-[#141414]/90"
      />
      {children}
    </div>
  );
}

import Link from "next/link";
import { cn } from "@/lib/cn";

/** Links discretos para os termos e políticas. */
export function LegalLinks({ className }: { className?: string }) {
  const link = "underline-offset-2 hover:text-ink-2 hover:underline";
  return (
    <nav aria-label="Termos e políticas" className={cn("flex flex-wrap items-center justify-center gap-x-1.5 text-[11px] text-ink-3", className)}>
      <Link href="/termos" className={link}>
        Termos de uso
      </Link>
      <span aria-hidden>·</span>
      <Link href="/privacidade" className={link}>
        Privacidade
      </Link>
      <span aria-hidden>·</span>
      <Link href="/reembolso" className={link}>
        Reembolso
      </Link>
    </nav>
  );
}

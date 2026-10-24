import Image from "next/image";
import Link from "next/link";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link href="/hoje" className="flex items-center gap-2.5 rounded-lg" aria-label="Prisma, ir para Hoje">
      <Image
        src="/logo-prisma.png"
        alt=""
        width={size}
        height={size}
        className="rounded-[22%]"
      />
      <span className="text-lead font-semibold tracking-[-0.01em] text-ink">Prisma</span>
    </Link>
  );
}

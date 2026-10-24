import Image from "next/image";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import { COMPANY } from "@/lib/legal";
import { LegalLinks } from "@/components/layout/legal-links";

export interface LegalSection {
  title: string;
  /** Parágrafos; um item que é lista vira tópicos. */
  body: Array<string | string[]>;
}

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-10 sm:py-14">
      <article className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-prisma.png" alt="" width={32} height={32} className="rounded-[22%]" />
            <span className="font-semibold text-ink">Prisma</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-meta font-semibold text-ink-2 hover:text-ink">
            <LuArrowLeft className="size-4" aria-hidden />
            Voltar
          </Link>
        </div>

        <h1 className="mt-10 text-display font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        <p className="mt-2 text-meta text-ink-3">Última atualização: {COMPANY.updatedAt}</p>
        <p className="mt-6 leading-relaxed text-ink-2">{intro}</p>

        {sections.map((s, i) => (
          <section key={s.title} className="mt-8">
            <h2 className="text-lead font-semibold text-ink">
              {i + 1}. {s.title}
            </h2>
            {s.body.map((part, j) =>
              Array.isArray(part) ? (
                <ul key={j} className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-2">
                  {part.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={j} className="mt-3 leading-relaxed text-ink-2">
                  {part}
                </p>
              ),
            )}
          </section>
        ))}

        <div className="mt-12 border-t border-line pt-6">
          <p className="text-meta text-ink-3">
            Dúvidas? Escreva para{" "}
            <a href={`mailto:${COMPANY.email}`} className="font-semibold text-primary-ink hover:underline">
              {COMPANY.email}
            </a>
            .
          </p>
          <LegalLinks className="mt-4 justify-start" />
        </div>
      </article>
    </main>
  );
}

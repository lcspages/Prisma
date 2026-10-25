"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuCirclePlay } from "react-icons/lu";
import { tutorialFor } from "@/lib/tutorials";

/** Botão “Ver tutorial” no topo da página, quando aquela parte já tem vídeo. */
export function TutorialHint() {
  const pathname = usePathname();
  const t = tutorialFor(pathname);
  if (!t) return null;
  return (
    <Link
      href={`/tutoriais?v=${t.id}`}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-meta font-semibold text-primary-ink hover:brightness-95"
    >
      <LuCirclePlay className="size-4" aria-hidden />
      Ver tutorial
    </Link>
  );
}

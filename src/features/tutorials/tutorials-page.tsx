"use client";

import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { LuCirclePlay, LuClock, LuCompass, LuMail, LuPlay, LuSmartphone } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { COMPANY } from "@/lib/legal";
import { youtubeEmbed } from "@/lib/landing";
import { TUTORIALS, type Tutorial } from "@/lib/tutorials";
import { MODULES_NAV, PRIMARY_NAV } from "@/components/layout/nav-items";
import { Modal } from "@/components/ui/modal";
import { Page, PageHeader } from "@/components/ui/page";
import { openInstallGuide } from "@/features/install/install-guide";

function iconFor(t: Tutorial): IconType {
  if (t.id === "comece") return LuCompass;
  if (t.id === "instalar") return LuSmartphone;
  return [...PRIMARY_NAV, MODULES_NAV].find((n) => n.href === t.href)?.icon ?? LuCirclePlay;
}

export function TutorialsPage() {
  const [playing, setPlaying] = useState<Tutorial | null>(null);
  const ready = TUTORIALS.filter((t) => t.src).length;

  // /tutoriais?v=habitos abre o vídeo direto (vem do botão “Ver tutorial”).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("v");
    const t = TUTORIALS.find((x) => x.id === id && x.src);
    if (t) setPlaying(t);
  }, []);

  return (
    <Page>
      <PageHeader
        title="Tutoriais"
        description={
          ready > 0
            ? "Vídeos curtos mostrando como usar cada parte do Prisma."
            : "Vídeos curtos mostrando como usar cada parte do Prisma. Eles estão sendo gravados e aparecem aqui assim que ficarem prontos."
        }
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TUTORIALS.map((t) => {
          const Icon = iconFor(t);
          const has = Boolean(t.src);
          return (
            <li key={t.id}>
              <button
                type="button"
                disabled={!has}
                onClick={() => setPlaying(t)}
                aria-label={has ? `Assistir: ${t.title}` : `${t.title}: em breve`}
                className={cn(
                  "flex h-full w-full items-start gap-4 rounded-3xl border p-4 text-left transition-colors sm:p-5",
                  has ? "border-line bg-surface hover:border-line-strong" : "cursor-default border-dashed border-line-strong bg-surface/50",
                )}
              >
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", has ? "bg-primary text-on-primary" : "bg-surface-2 text-ink-2")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{t.title}</span>
                  <span className="mt-0.5 block text-meta text-ink-2">{t.description}</span>
                  <span
                    className={cn(
                      "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-meta font-semibold",
                      has ? "bg-primary-soft text-primary-ink" : "bg-surface-2 text-ink-3",
                    )}
                  >
                    {has ? <LuPlay className="size-3" aria-hidden /> : <LuClock className="size-3" aria-hidden />}
                    {has ? "Assistir" : "Em breve"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={openInstallGuide}
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 font-semibold text-ink hover:border-line-strong"
        >
          <LuSmartphone className="size-4 text-primary" aria-hidden />
          Como instalar no celular
        </button>
        <a
          href={`mailto:${COMPANY.email}`}
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 font-semibold text-ink hover:border-line-strong"
        >
          <LuMail className="size-4 text-primary" aria-hidden />
          Ficou com dúvida? Fale com a gente
        </a>
      </div>

      <Modal open={Boolean(playing)} onClose={() => setPlaying(null)} title={playing?.title ?? ""} description={playing?.description} size={playing?.srcDesktop ? "lg" : "md"}>
        {playing && <TutorialVideo tutorial={playing} />}
      </Modal>
    </Page>
  );
}

/** Computador (tela larga): usa o vídeo deitado, quando o tutorial tem um. */
function useWideScreen() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

function TutorialVideo({ tutorial }: { tutorial: Tutorial }) {
  const wide = useWideScreen();
  const desktop = wide && Boolean(tutorial.srcDesktop);
  const src = desktop ? (tutorial.srcDesktop as string) : tutorial.src;
  const vertical = desktop ? false : tutorial.vertical;
  const embed = youtubeEmbed(src);
  return (
    <div
      className={cn(
        "relative mx-auto overflow-hidden rounded-2xl bg-[#141414]",
        vertical ? "aspect-[9/16] w-[min(100%,calc((92dvh-180px)*0.5625))]" : "aspect-video w-full",
      )}
    >
      {embed ? (
        <iframe
          src={embed}
          title={`Tutorial: ${tutorial.title}`}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <video key={src} src={src} controls playsInline autoPlay className="absolute inset-0 size-full object-contain">
          Seu navegador não conseguiu abrir o vídeo.
        </video>
      )}
    </div>
  );
}

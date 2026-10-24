import { LuPlay } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { LANDING_VIDEO, youtubeEmbed } from "@/lib/landing";

/**
 * Seção do vídeo de apresentação. O vídeo é configurado em lib/landing.ts.
 * Sem vídeo, a seção some no site publicado e mostra um espaço reservado nos testes.
 */
export function VideoSlot() {
  const { src, poster, vertical } = LANDING_VIDEO;
  if (!src && process.env.NODE_ENV === "production") return null;

  const frame = cn(
    "relative mx-auto overflow-hidden rounded-[28px] bg-[#141414]",
    vertical ? "aspect-[9/16] w-[min(78vw,320px)]" : "aspect-video w-full max-w-[720px]",
  );
  const embed = src ? youtubeEmbed(src) : null;

  return (
    <section aria-labelledby="video-title" className="mx-auto w-full max-w-5xl px-5 pb-14 sm:px-8 lg:pb-20">
      <div className="grid justify-items-center gap-8">
        <h2 id="video-title" className="text-center text-[28px] font-semibold leading-[34px] tracking-[-0.025em] text-ink sm:text-[36px] sm:leading-[42px]">
          Veja como funciona
        </h2>
        <div className={frame}>
          {embed ? (
            <iframe
              src={embed}
              title="Vídeo de apresentação do Prisma"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 size-full"
            />
          ) : src ? (
            <video src={src} poster={poster || undefined} controls playsInline preload="metadata" className="absolute inset-0 size-full object-cover">
              Seu navegador não conseguiu abrir o vídeo.
            </video>
          ) : (
            <div className="absolute inset-0 grid place-items-center border-2 border-dashed border-white/20 p-6 text-center">
              <div>
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-on-primary">
                  <LuPlay className="size-6" aria-hidden />
                </span>
                <p className="mt-4 text-[15px] font-semibold text-white">Espaço do vídeo</p>
                <p className="mt-1 text-[13px] leading-[19px] text-white/60">Aparece no site assim que o vídeo for colocado em lib/landing.ts</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

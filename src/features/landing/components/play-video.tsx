"use client";

import { useRef, useState } from "react";
import { LuPlay } from "react-icons/lu";

/** Vídeo com um botão grande de play no meio (some quando começa a tocar). */
export function PlayVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster || undefined}
        controls={started}
        playsInline
        preload="none"
        onPlay={() => setStarted(true)}
        className="absolute inset-0 size-full object-cover"
      >
        Seu navegador não conseguiu abrir o vídeo.
      </video>
      {!started && (
        <button
          type="button"
          aria-label="Assistir ao vídeo"
          onClick={() => {
            setStarted(true);
            void ref.current?.play().catch(() => {});
          }}
          className="group absolute inset-0 grid place-items-center bg-black/15 transition-colors hover:bg-black/25"
        >
          <span className="grid size-20 place-items-center rounded-full bg-[#141414]/85 text-white shadow-[0_12px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/20 backdrop-blur-md transition-transform group-hover:scale-105 group-active:scale-95">
            <LuPlay className="ml-1 size-8 fill-white text-white" aria-hidden />
          </span>
        </button>
      )}
    </>
  );
}

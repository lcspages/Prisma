import type { MetadataRoute } from "next";

/** Permite instalar o Prisma na tela inicial do celular (abre em tela cheia, como um app). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/hoje",
    name: "Prisma",
    short_name: "Prisma",
    description: "Rotina, hábitos, tarefas, foco e treino num lugar só.",
    lang: "pt-BR",
    start_url: "/hoje",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8F8F8",
    theme_color: "#2998FF",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

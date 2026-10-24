import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/components/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Prisma: sua rotina inteira num lugar só" },
  description: "Hábitos, tarefas, foco, estudos e treino no mesmo app. Abre no navegador do celular ou do computador, sem baixar nada.",
  openGraph: {
    title: "Prisma: sua rotina inteira num lugar só",
    description: "Hábitos, tarefas, foco, estudos e treino no mesmo app. Abre no navegador, sem baixar nada.",
    images: [{ url: "/landing/og.png", width: 1200, height: 630, alt: "Prisma" }],
    locale: "pt_BR",
    type: "website",
  },
};

/** Página inicial pública (quem já está logado vai direto para o app: ver proxy.ts). */
export default function Home() {
  return <LandingPage />;
}

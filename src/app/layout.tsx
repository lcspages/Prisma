import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { PortraitOnly } from "@/components/layout/portrait-only";
import { ThemeProvider, themeScript } from "@/providers/theme-provider";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://prismarotina.com.br"),
  title: { default: "Prisma", template: "%s | Prisma" },
  description: "Rotina, estudos, treino e foco organizados em módulos.",
  icons: { icon: "/icon-64.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Prisma", statusBarStyle: "default" },
  // O iPhone abre o ícone da tela inicial como app (sem a barra do navegador) com esta marcação.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  // Ocupa a tela toda no iPhone e deixa o app saber o tamanho da barrinha de baixo
  // (sem isso, a barrinha do iPhone fica por cima do menu).
  viewportFit: "cover",
  // Sem zoom de pinça no celular.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F8F8" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={poppins.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <PortraitOnly />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
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
};

export const viewport: Viewport = {
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
      </body>
    </html>
  );
}

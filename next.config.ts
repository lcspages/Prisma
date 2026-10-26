import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O service worker (notificações) sempre na versão mais nova.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }];
  },
  experimental: {
    // Importa só os ícones usados de react-icons, em vez do pacote inteiro.
    optimizePackageImports: ["react-icons"],
  },
};

export default nextConfig;

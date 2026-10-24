import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Importa só os ícones usados de react-icons, em vez do pacote inteiro.
    optimizePackageImports: ["react-icons"],
  },
};

export default nextConfig;

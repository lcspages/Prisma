/** Dados de contato usados nas políticas e na tela de assinatura. */
export const COMPANY = {
  name: "andrade.dsgn",
  product: "Prisma",
  email: "rotinaprisma@gmail.com",
  refundDays: 7,
  updatedAt: "24 de outubro de 2026",
};

/** Página de compra do plano mensal na Kiwify (configure NEXT_PUBLIC_CHECKOUT_URL). */
export const CHECKOUT_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL ?? "";

/** Página de compra do plano vitalício na Kiwify (configure NEXT_PUBLIC_CHECKOUT_URL_VITALICIO). */
export const CHECKOUT_URL_LIFETIME = process.env.NEXT_PUBLIC_CHECKOUT_URL_VITALICIO ?? "";

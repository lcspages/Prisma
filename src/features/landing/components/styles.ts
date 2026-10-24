/** Estilos compartilhados da landing page (arquivo comum, usado no servidor e no navegador). */

/** Títulos leves e grandes. */
export const TITLE =
  "text-[32px] font-light leading-[38px] tracking-[-0.03em] text-ink sm:text-[44px] sm:leading-[50px] lg:text-[56px] lg:leading-[62px]";

/** Vidro fosco sobre o céu. */
export const GLASS =
  "border border-white/70 bg-white/55 shadow-[0_10px_36px_-14px_rgba(16,72,140,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1b1b1b]/60";

/** Botão principal: pílula escura (fica clara no tema escuro). */
export const BTN_DARK =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#141414] font-semibold text-[#F8F8F8] transition-[transform,filter] hover:brightness-125 active:translate-y-px dark:bg-[#F8F8F8] dark:text-[#141414] dark:hover:brightness-90";

/** Botão secundário de vidro. */
export const BTN_GLASS =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/80 bg-white/60 font-semibold text-ink backdrop-blur-md transition-colors hover:bg-white/85 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15";

/** Seção do PC ocupando uma tela inteira (16:9), com o conteúdo centralizado na altura. */
export const SCREEN = "lg:flex lg:min-h-svh lg:items-center lg:py-20";

/** Largura do conteúdo. */
export const WRAP = "mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12";

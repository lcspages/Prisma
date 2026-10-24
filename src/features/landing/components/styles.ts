/** Estilos compartilhados da landing page (arquivo comum, usado no servidor e no navegador). */

export const TITLE =
  "text-[28px] font-semibold leading-[34px] tracking-[-0.025em] text-ink sm:text-[36px] sm:leading-[42px] lg:text-[44px] lg:leading-[50px]";

/** Celular no PC: a largura acompanha a altura da tela, para cada seção caber num monitor 16:9. */
export const PHONE_DESKTOP = "w-[min(300px,calc((100svh-190px)*0.462))]";

/** Seção do PC ocupando uma tela inteira (16:9), com o conteúdo centralizado na altura. */
export const SCREEN = "lg:flex lg:min-h-[calc(100svh-64px)] lg:items-center lg:py-16";

/** O mesmo tamanho de celular, só a partir do PC (classe escrita por extenso para o Tailwind encontrar). */
export const PHONE_DESKTOP_LG = "lg:w-[min(300px,calc((100svh-190px)*0.462))]";

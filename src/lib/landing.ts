/**
 * Conteúdo da página inicial (landing page) que muda com o tempo.
 * Os links de compra vêm de NEXT_PUBLIC_CHECKOUT_URL e NEXT_PUBLIC_CHECKOUT_URL_VITALICIO (ver lib/legal.ts).
 */

export const PRICES = {
  mensal: "R$ 25",
  vitalicio: "R$ 97",
};

/**
 * Vídeo de apresentação.
 *
 * Para colocar o vídeo, preencha `src` com UM destes:
 *   - um arquivo na pasta public, por exemplo "/landing/video-prisma.mp4"
 *   - um link do YouTube (normal, curto ou de Shorts)
 * `poster` é a imagem que aparece antes de dar play (opcional, ex.: "/landing/video-capa.webp").
 * `vertical: true` para vídeo em pé (formato TikTok/Reels), false para deitado.
 * `srcDesktop` / `posterDesktop` (opcionais): vídeo deitado para quem abre no computador;
 * o celular continua com `src`.
 *
 * Enquanto `src` estiver vazio, a seção não aparece no site publicado
 * (só aparece um espaço reservado nas versões de teste).
 */
export const LANDING_VIDEO: { src: string; poster: string; vertical: boolean; srcDesktop?: string; posterDesktop?: string } = {
  // Mesmo vídeo do tutorial "Comece por aqui"
  src: "/tutoriais/comece-por-aqui-celular.mp4",
  poster: "/landing/video-capa-celular.jpg",
  vertical: true,
  srcDesktop: "/tutoriais/comece-por-aqui-computador.mp4",
  posterDesktop: "/landing/video-capa-computador.jpg",
};

/** Transforma um link do YouTube no endereço de incorporação; null se não for YouTube. */
export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` : null;
}

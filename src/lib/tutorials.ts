/**
 * Vídeos de tutorial, um por parte do Prisma.
 *
 * Para publicar um vídeo, preencha `src` com UM destes:
 *   - um link do YouTube (normal, curto ou de Shorts; pode ser "não listado")
 *   - um arquivo na pasta public, por exemplo "/tutoriais/habitos.mp4"
 * `srcDesktop` (opcional) é o vídeo deitado para quem usa computador; `src` fica para o celular.
 * `vertical: true` para vídeo em pé (formato celular), false para deitado.
 *
 * Enquanto `src` estiver vazio, o card aparece como “Em breve”.
 * Com vídeo, aparece também um botão “Ver tutorial” no topo da página daquela parte.
 */
export interface Tutorial {
  id: string;
  /** Página do app ligada ao vídeo (mostra o botão “Ver tutorial” nela). */
  href: string | null;
  title: string;
  description: string;
  src: string;
  /** Versão para computador (vídeo deitado). Se vazio, todos veem o mesmo vídeo de `src`. */
  srcDesktop?: string;
  vertical: boolean;
}

export const TUTORIALS: Tutorial[] = [
  {
    id: "comece",
    href: null,
    title: "Comece por aqui",
    description: "Uma volta rápida pelo Prisma e por onde começar.",
    src: "/tutoriais/comece-por-aqui-celular.mp4",
    srcDesktop: "/tutoriais/comece-por-aqui-computador.mp4",
    vertical: true,
  },
  {
    id: "hoje",
    href: "/hoje",
    title: "Hoje",
    description: "O que fazer agora, seu resumo do dia e a próxima tarefa.",
    src: "/tutoriais/hoje-celular.mp4",
    srcDesktop: "/tutoriais/hoje-computador.mp4",
    vertical: true,
  },
  {
    id: "habitos",
    href: "/habitos",
    title: "Hábitos",
    description: "Criar hábitos, marcar o dia e manter a sequência.",
    src: "/tutoriais/habitos-celular.mp4",
    srcDesktop: "/tutoriais/habitos-computador.mp4",
    vertical: true,
  },
  {
    id: "tarefas",
    href: "/tarefas",
    title: "Tarefas",
    description: "Criar, editar, dividir em passos e repetir tarefas.",
    src: "/tutoriais/tarefas-celular.mp4",
    srcDesktop: "/tutoriais/tarefas-computador.mp4",
    vertical: true,
  },
  {
    id: "semana",
    href: "/semana",
    title: "Semana",
    description: "Planejar os dias e mudar tarefas de dia.",
    src: "/tutoriais/semana-celular.mp4",
    srcDesktop: "/tutoriais/semana-computador.mp4",
    vertical: true,
  },
  {
    id: "matriz",
    href: "/matriz",
    title: "Matriz",
    description: "Separar o urgente do importante.",
    src: "/tutoriais/matriz-celular.mp4",
    srcDesktop: "/tutoriais/matriz-computador.mp4",
    vertical: true,
  },
  { id: "foco", href: "/foco", title: "Foco", description: "Timer, pausas, sons e anotar ideias sem parar.", src: "", vertical: true },
  { id: "treino", href: "/treino", title: "Treino", description: "Montar a divisão da semana e registrar cargas.", src: "", vertical: true },
  { id: "modulos", href: "/modulos", title: "Módulos", description: "Organizar cada área da vida com tarefas, anotações e metas.", src: "", vertical: true },
  { id: "relatorios", href: "/relatorios", title: "Relatórios", description: "Ver sua evolução, nível e revisão da semana.", src: "", vertical: true },
  {
    id: "amigos",
    href: "/amigos",
    title: "Amigos",
    description: "Adicionar amigos, criar grupos e disputar batalhas por pontos.",
    src: "",
    vertical: true,
  },
  {
    id: "lembretes",
    href: "/perfil",
    title: "Lembretes",
    description: "Ativar os avisos da manhã e da noite no celular.",
    src: "",
    vertical: true,
  },
  {
    id: "caixa-de-entrada",
    href: "/caixa-de-entrada",
    title: "Caixa de entrada",
    description: "Guardar ideias rápidas e transformar em tarefas.",
    src: "",
    vertical: true,
  },
  {
    id: "instalar",
    href: null,
    title: "Instalar no celular",
    description: "Colocar o Prisma na tela inicial do Android ou iPhone.",
    src: "",
    vertical: true,
  },
];

/** Tutorial com vídeo publicado para a página atual (ou null). */
export function tutorialFor(pathname: string): Tutorial | null {
  const t = TUTORIALS.find((x) => x.href && (pathname === x.href || pathname.startsWith(`${x.href}/`)));
  return t && t.src ? t : null;
}

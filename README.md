# Prisma

App web de rotina, estudos, treino e foco, organizado em módulos criados pelo usuário.
Next.js 16 (App Router) + TypeScript + Tailwind CSS v4. Cloud-first: sem modo offline.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem sessão, o app abre a tela de login (`/login`); depois de entrar, vai para `/hoje`.

## Contas, assinatura e dados

- **Login por cliente** (Supabase Auth): `/login` com e-mail e senha; `/primeiro-acesso` e
  `/esqueci-senha` enviam um link por e-mail que abre `/definir-senha`. O primeiro acesso só
  envia o link para e-mails com compra.
- **Assinatura**: `public.subscriptions`, preenchida pelos avisos da Kiwify em `/api/kiwify`.
  Sem assinatura valendo, o app mostra `/assinatura` (assinatura inativa).
  Liberar alguém à mão: no painel do Supabase, insira em `subscriptions` uma linha com o
  e-mail, `plan = cortesia` e `status = ativa`.
- **Dados**: cada item fica em `public.entities`, preso ao usuário. O navegador só fala com
  `/api/dados`, que confere login e assinatura e roda as mesmas operações de `lib/ops.ts`.
- **Segurança**: as tabelas ficam fechadas para a internet (RLS sem regras públicas); o
  servidor usa funções `prisma_*` que exigem a chave `APP_DB_SECRET`. O limite de tentativas
  de login (5 a cada 10 min por e-mail e por endereço) fica no banco.
- **Termos**: `/termos`, `/privacidade`, `/reembolso` (links discretos no rodapé).

Variáveis de ambiente: veja `.env.example`. Os valores reais ficam só na Vercel e no
`.env.local`, que **nunca** vai para o GitHub (`.gitignore`).

`NEXT_PUBLIC_DATA_SOURCE=mock` usa dados de exemplo no navegador, só para testes.

## Telas

| Rota | O que faz |
| --- | --- |
| `/hoje` | Saudação, resumo rápido, **hábitos de hoje (um toque marca)**, bloco "A seguir", blocos das tarefas de hoje e blocos menores dos próximos dias. No primeiro acesso, um cartão explica como o app funciona |
| `/habitos` | Criar hábito em dois toques (nome ou sugestão + dias), marcar hoje, semana de segunda a domingo, sequência, vínculo opcional a um módulo |
| `/tarefas` | Todas as tarefas (com ou sem módulo) em Atrasadas, Hoje, Amanhã, Próximos dias e Sem data; filtro por módulo ou "Sem módulo", abertas ou concluídas; editar e excluir em cada linha |
| `/semana` | Colunas de segunda a domingo, carga de horas por dia, arrastar tarefas entre os dias, bandejas "Atrasadas" e "Sem data" |
| `/matriz` | Matriz de Eisenhower 2x2 com arrastar entre quadrantes e filtro por contexto |
| `/foco` | Timer (25/50/90 ou livre), pausa automática, sons ambientes gerados no navegador, captura de interrupções e ideias |
| `/treino` | Treino do dia (segunda a domingo, hoje destacado), carga e repetições com o recorde anterior em cinza, cardio, finalização, cronômetro que abre a playlist, divisão semanal arrastável e exercícios |
| `/relatorios` | Nível e XP, revisão da semana com "Quebrar em passos", mapa de consistência do ano e picos de energia |
| `/caixa-de-entrada` | Ideias e interrupções; "Virar tarefa" ou descartar |
| `/modulos` | Lista de módulos e criação a partir de modelo (Em branco, Estudos, Projeto de código, Treino) |
| `/modulos/[id]` | Tarefas (criadas e editadas na mesma janela, com editar e excluir à mostra), hábitos vinculados, anotações e metas |

Em qualquer tela: `Ctrl/⌘ + K` abre a paleta (criar tarefa com `#tag @módulo 14:00 45min`; sem `@módulo` a tarefa fica sem módulo;
`ideia: …` para a caixa de entrada, navegar, iniciar foco, trocar o tema). Clicar em qualquer
tarefa abre o editor completo (data, horário, duração, prioridade, tags, repetição, dependência,
passos e notas).

Aviso automático: revisão da semana (sexta a partir das 17h e fim de semana).

## Estrutura

```
src/
├─ app/                       rotas (App Router); cada page.tsx só monta o componente da função
├─ components/
│  ├─ ui/                     Button, Modal, Field/Input/Select/Chip, Tabs, Page, TaskCheck…
│  └─ layout/                 AppShell, Sidebar, Topbar (com mini timer), MobileNav (+ "Mais"),
│                             CommandPalette, GlobalDialogs, Toaster, WorkspaceGate
├─ features/
│  ├─ today/                  tela inicial
│  ├─ tasks/                  cards, editor, recorrência, matriz, criação rápida
│  ├─ habits/                 hábitos: criação rápida, semana seg-dom, vínculo a módulo, boas-vindas
│  ├─ training/               aba Treino (plano único do usuário)
│  ├─ week/  matrix/  focus/  inbox/  reports/  modules/  gamification/
├─ lib/
│  ├─ ops.ts                  operações de domínio puras (mesmo código no cliente e no servidor)
│  ├─ api/                    contrato PrismaApi, cliente da nuvem e modo de demonstração
│  ├─ server/                 Supabase, sessão, Kiwify (só no servidor)
│  ├─ store/app-store.ts      estado global: atualização otimista, fila de escritas, desfazer, timer
│  ├─ audio/ambient.ts        ruído branco, marrom, chuva e lo-fi via Web Audio API
│  ├─ selectors.ts  dates.ts  hooks/
├─ types/domain.ts            modelo de domínio
└─ proxy.ts                   protege as rotas sem sessão
supabase/migrations/          banco: dados, assinaturas, tentativas de login e funções
```

## Como os dados fluem (cloud-first)

1. Uma ação (`toggleTask`, `moveTask`, `logExercise`…) roda a operação de `lib/ops.ts` e a tela muda na hora.
2. A mesma operação vai para a nuvem por uma **fila**, na ordem em que aconteceu.
3. A resposta oficial substitui o estado otimista. Os ids novos são gerados no cliente, então os dois lados batem.
4. Se falhar, o estado é recarregado da nuvem e aparece "Tentar de novo". Fechar a aba com algo ainda salvando pede confirmação.

No servidor, `src/app/api/dados` carrega os dados do Supabase, roda a operação e grava só o que mudou.

## Design system

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `canvas` | `#F8F8F8` | `#141414` | fundo do app |
| `surface` | `#FFFFFF` | `#1B1B1B` | cartões e painéis |
| `ink` | `#141414` | `#ECECEC` | texto principal |
| `primary` | `#2998FF` | `#2998FF` | bloco "A seguir", ação principal, timer |
| `accent` | `#FFD648` | `#FFD648` | XP, sequências, prioridade |

- Sobre azul ou amarelo, o texto é sempre `#141414` (branco sobre `#2998FF` fica em ~3:1, abaixo do mínimo de 4,5:1).
- O dark mode tem tokens próprios: superfícies sobem de tom em vez de usar sombra e o texto não é branco puro.
- Poppins 500 como peso base, 600 para títulos.

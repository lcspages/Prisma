/**
 * Dados de exemplo do modo de demonstração.
 * As datas são relativas ao momento em que o app é aberto pela primeira vez.
 */
import type {
  Exercise,
  ExerciseLog,
  FocusSession,
  Folder,
  Goal,
  Habit,
  InboxItem,
  Module,
  Note,
  Task,
  TrainingPlan,
  Workspace,
  XpEvent,
} from "@/types/domain";
import { ALL_DAYS, TRAINING_PLAN_ID } from "@/types/domain";
import { addDays, toISODate } from "@/lib/dates";
import { xpForFocus, xpForTask } from "@/features/gamification/lib/xp";

/** Gerador pseudoaleatório determinístico (os dados não mudam a cada recarga). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function createSeed(now = new Date()): Workspace {
  const today = toISODate(now);
  const day = (offset: number) => toISODate(addDays(now, offset));
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
  const sameDay = (d: Date) => toISODate(d) === today;
  const iso = (d: Date) => d.toISOString();
  const created = iso(addDays(now, -10));

  const modules: Module[] = [
    { id: "m-mat", name: "Matemática", color: "blue", icon: "sigma", template: "study", position: 0 },
    { id: "m-cod", name: "Código", color: "violet", icon: "code", template: "code", position: 1 },
    { id: "m-neg", name: "Negócios", color: "yellow", icon: "briefcase", template: "blank", position: 2 },
    {
      id: "m-tre",
      name: "Saúde",
      color: "green",
      icon: "dumbbell",
      template: "training",
      position: 3,
    },
  ];

  const folders: Folder[] = [
    { id: "f-calc", moduleId: "m-mat", parentId: null, name: "Cálculo I", depth: 1 },
    { id: "f-calc-der", moduleId: "m-mat", parentId: "f-calc", name: "Derivadas", depth: 2 },
    { id: "f-calc-lis", moduleId: "m-mat", parentId: "f-calc", name: "Listas", depth: 2 },
    { id: "f-calc-int", moduleId: "m-mat", parentId: "f-calc", name: "Integrais", depth: 2 },
    { id: "f-prov", moduleId: "m-mat", parentId: null, name: "Provas", depth: 1 },
    { id: "f-loja", moduleId: "m-cod", parentId: null, name: "Loja virtual", depth: 1 },
    { id: "f-loja-fe", moduleId: "m-cod", parentId: "f-loja", name: "Front-end", depth: 2 },
    { id: "f-loja-be", moduleId: "m-cod", parentId: "f-loja", name: "Back-end", depth: 2 },
    { id: "f-fin", moduleId: "m-neg", parentId: null, name: "Financeiro", depth: 1 },
    { id: "f-cli", moduleId: "m-neg", parentId: null, name: "Clientes", depth: 1 },
    { id: "f-con", moduleId: "m-neg", parentId: null, name: "Conteúdo", depth: 1 },
    { id: "f-rot", moduleId: "m-tre", parentId: null, name: "Rotina", depth: 1 },
  ];

  const base = {
    folderId: null,
    tags: [],
    urgent: false,
    important: false,
    dueDate: today,
    scheduledTime: null,
    estimateMin: null,
    subtasks: [],
    blockedById: null,
    recurrence: null,
    postponedCount: 0,
    completedAt: null,
    spawnedNextId: null,
    createdAt: created,
  } satisfies Omit<Task, "id" | "title" | "moduleId">;

  const doneAt = (m: number) => {
    const d = minutesAgo(m);
    return sameDay(d) ? iso(d) : iso(now);
  };

  const tasks: Task[] = [
    {
      ...base,
      id: "t-lista3",
      title: "Lista 3 de limites",
      moduleId: "m-mat",
      folderId: "f-calc-lis",
      tags: ["faculdade"],
      urgent: true,
      important: true,
      dueDate: day(-1),
      estimateMin: 50,
      postponedCount: 2,
      subtasks: [
        { id: "s1", title: "Exercícios 1 a 5", done: true },
        { id: "s2", title: "Exercícios 6 a 10", done: true },
        { id: "s3", title: "Exercícios 11 a 15", done: false },
        { id: "s4", title: "Conferir com o gabarito", done: false },
        { id: "s5", title: "Enviar no portal", done: false },
      ],
    },
    {
      ...base,
      id: "t-caixa",
      title: "Fechamento de caixa",
      moduleId: "m-neg",
      folderId: "f-fin",
      tags: ["negocios"],
      important: true,
      scheduledTime: "09:00",
      estimateMin: 15,
      recurrence: { rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", label: "Dias úteis", streak: 12 },
    },
    {
      ...base,
      id: "t-cadeia",
      title: "Revisar regra da cadeia",
      moduleId: "m-mat",
      folderId: "f-calc-der",
      tags: ["faculdade"],
      important: true,
      scheduledTime: "10:30",
      estimateMin: 45,
    },
    {
      ...base,
      id: "t-carrinho",
      title: "Componente do carrinho",
      moduleId: "m-cod",
      folderId: "f-loja-fe",
      tags: ["front-end"],
      urgent: true,
      important: true,
      scheduledTime: "14:00",
      estimateMin: 90,
      subtasks: [
        { id: "s1", title: "Layout dos itens", done: true },
        { id: "s2", title: "Cálculo do subtotal", done: false },
        { id: "s3", title: "Estado vazio", done: false },
        { id: "s4", title: "Testes do componente", done: false },
      ],
    },
    {
      ...base,
      id: "t-pagamento",
      title: "Endpoint de pagamento",
      moduleId: "m-cod",
      folderId: "f-loja-be",
      tags: ["back-end"],
      important: true,
      scheduledTime: "16:00",
      estimateMin: 60,
      blockedById: "t-carrinho",
    },
    {
      ...base,
      id: "t-treino",
      title: "Peito superior e deltoides",
      moduleId: "m-tre",
      folderId: "f-rot",
      tags: ["treino"],
      important: true,
      scheduledTime: "18:30",
      estimateMin: 70,
      recurrence: { rule: "FREQ=WEEKLY;BYDAY=MO,FR", label: "Segunda e sexta", streak: 5 },
    },
    {
      ...base,
      id: "t-orcamento",
      title: "Responder orçamento de identidade visual",
      moduleId: "m-neg",
      folderId: "f-cli",
      tags: ["negocios"],
      urgent: true,
      estimateMin: 15,
    },
    {
      ...base,
      id: "t-video",
      title: "Gravar vídeo da matriz de prioridade",
      moduleId: "m-neg",
      folderId: "f-con",
      tags: ["negocios", "conteudo"],
      important: true,
      estimateMin: 40,
      postponedCount: 3,
      subtasks: [
        { id: "s1", title: "Roteiro", done: true },
        { id: "s2", title: "Gravar", done: false },
        { id: "s3", title: "Editar e legendar", done: false },
      ],
    },
    {
      ...base,
      id: "t-anotacoes",
      title: "Organizar anotações de integrais",
      moduleId: "m-mat",
      folderId: "f-calc-int",
      tags: ["faculdade"],
      estimateMin: 25,
    },
    {
      ...base,
      id: "t-flashcards",
      title: "Flashcards de derivadas",
      moduleId: "m-mat",
      folderId: "f-calc-der",
      tags: ["faculdade"],
      estimateMin: 20,
      completedAt: doneAt(240),
    },
    {
      ...base,
      id: "t-pr",
      title: "Revisar PR do cabeçalho",
      moduleId: "m-cod",
      folderId: "f-loja-fe",
      tags: ["front-end"],
      estimateMin: 15,
      completedAt: doneAt(120),
    },
    // Próximos dias
    {
      ...base,
      id: "t-prova",
      title: "Prova de Cálculo I",
      moduleId: "m-mat",
      folderId: "f-prov",
      tags: ["faculdade"],
      urgent: true,
      important: true,
      dueDate: day(4),
      scheduledTime: "19:00",
      estimateMin: 120,
    },
    {
      ...base,
      id: "t-simulado",
      title: "Simulado de derivadas",
      moduleId: "m-mat",
      folderId: "f-prov",
      tags: ["faculdade"],
      important: true,
      dueDate: day(2),
      estimateMin: 60,
    },
    {
      ...base,
      id: "t-deploy",
      title: "Deploy da loja em homologação",
      moduleId: "m-cod",
      folderId: "f-loja",
      tags: ["back-end"],
      important: true,
      dueDate: day(3),
      scheduledTime: "15:00",
      estimateMin: 45,
    },
    {
      ...base,
      id: "t-nf",
      title: "Emitir notas fiscais do mês",
      moduleId: "m-neg",
      folderId: "f-fin",
      tags: ["negocios"],
      urgent: true,
      dueDate: day(1),
      estimateMin: 30,
    },
    {
      ...base,
      id: "t-pernas",
      title: "Treino de pernas",
      moduleId: "m-tre",
      folderId: "f-rot",
      tags: ["treino"],
      dueDate: day(5),
      scheduledTime: "18:30",
      estimateMin: 60,
    },
    {
      ...base,
      id: "t-post",
      title: "Post do carrossel de identidade visual",
      moduleId: "m-neg",
      folderId: "f-con",
      tags: ["conteudo"],
      dueDate: day(6),
      estimateMin: 50,
    },
    // Sem data
    {
      ...base,
      id: "t-portfolio",
      title: "Atualizar portfólio com 3 projetos",
      moduleId: "m-neg",
      folderId: "f-con",
      tags: ["negocios"],
      important: true,
      dueDate: null,
      estimateMin: 90,
    },
    {
      ...base,
      id: "t-dark",
      title: "Testar o dark mode da loja",
      moduleId: "m-cod",
      folderId: "f-loja-fe",
      tags: ["front-end"],
      dueDate: null,
      estimateMin: 30,
    },
  ];

  const notes: Note[] = [
    {
      id: "n-cadeia",
      moduleId: "m-mat",
      folderId: "f-calc-der",
      title: "Regra da cadeia",
      body: "(f∘g)'(x) = f'(g(x)) · g'(x)\n\nDerive a função de fora mantendo a de dentro, depois multiplique pela derivada da de dentro.",
      updatedAt: iso(addDays(now, -2)),
    },
    {
      id: "n-stack",
      moduleId: "m-cod",
      folderId: "f-loja",
      title: "Stack da loja",
      body: "Next.js, Postgres e pagamentos via Pix.\nAmbiente de homologação antes de cada entrega.",
      updatedAt: iso(addDays(now, -5)),
    },
    {
      id: "n-videos",
      moduleId: "m-neg",
      folderId: "f-con",
      title: "Ideias de vídeos",
      body: "Antes e depois de uma marca.\nComo escolho a paleta de um cliente.\nTimelapse de um post.",
      updatedAt: iso(addDays(now, -1)),
    },
  ];

  const goals: Goal[] = [
    { id: "g-listas", moduleId: "m-mat", folderId: "f-calc-lis", title: "Listas resolvidas no semestre", current: 3, target: 8, unit: "listas", dueDate: day(40) },
    { id: "g-clientes", moduleId: "m-neg", folderId: "f-cli", title: "Clientes fechados no mês", current: 4, target: 10, unit: "clientes", dueDate: day(8) },
    { id: "g-supino", moduleId: "m-tre", folderId: null, title: "Supino inclinado", current: 30, target: 40, unit: "kg", dueDate: null },
  ];

  const rand = seeded(23);

  const WEEKDAYS = [1, 2, 3, 4, 5];
  const habitChecks = (pattern: number, days: number[]) =>
    Array.from({ length: 30 }, (_, i) => i + 1)
      .filter((back) => days.includes(addDays(now, -back).getDay()))
      .filter((back) => (pattern === 1 ? back <= 9 : rand() < (pattern === 2 ? 0.8 : 0.35)))
      .map((back) => day(-back))
      .sort();

  const habits: Habit[] = [
    { id: "h-leitura", name: "Ler 20 páginas", days: ALL_DAYS, moduleId: null, checks: habitChecks(1, ALL_DAYS), createdAt: created },
    { id: "h-ingles", name: "Inglês 15 min", days: WEEKDAYS, moduleId: null, checks: habitChecks(2, WEEKDAYS), createdAt: created },
    { id: "h-agua", name: "Beber 2 L de água", days: ALL_DAYS, moduleId: "m-tre", checks: habitChecks(3, ALL_DAYS), createdAt: created },
  ];

  const inbox: InboxItem[] = [
    { id: "i2", kind: "idea", text: "Atalho para duplicar uma tarefa", createdAt: iso(minutesAgo(215)) },
    { id: "i3", kind: "idea", text: "Vídeo de 15 s mostrando o modo foco", createdAt: iso(addDays(now, -1)) },
  ];

  // Sessões de foco: um ano, mais à tarde que de manhã (alimenta os relatórios).
  const focusSessions: FocusSession[] = [];
  const hourWeights = [
    [8, 2], [9, 3], [10, 4], [11, 3], [14, 5], [15, 6], [16, 5], [17, 3], [20, 2], [21, 2], [23, 1],
  ];
  const totalWeight = hourWeights.reduce((s, [, w]) => s + w, 0);
  const pickHour = () => {
    let r = rand() * totalWeight;
    for (const [h, w] of hourWeights) {
      r -= w;
      if (r <= 0) return h;
    }
    return 15;
  };
  for (let back = 364; back >= 1; back--) {
    const date = addDays(now, -back);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const count = back <= 18 ? 1 + Math.floor(rand() * 3) : Math.floor(rand() * (weekend ? 2 : back > 200 ? 3 : 4));
    for (let i = 0; i < count; i++) {
      const start = new Date(date);
      start.setHours(pickHour(), Math.floor(rand() * 4) * 15, 0, 0);
      const minutes = [25, 25, 45, 50, 60, 90][Math.floor(rand() * 6)];
      focusSessions.push({
        id: `fs-${back}-${i}`,
        taskId: null,
        startedAt: iso(start),
        endedAt: iso(new Date(start.getTime() + minutes * 60_000)),
        minutes,
      });
    }
  }
  [
    [300, 50, "t-flashcards"],
    [150, 35, "t-pr"],
  ].forEach(([ago, minutes, taskId], i) => {
    const end = minutesAgo(Number(ago) - Number(minutes));
    const start = minutesAgo(Number(ago));
    if (!sameDay(start)) return;
    focusSessions.push({ id: `fs-today-${i}`, taskId: String(taskId), startedAt: iso(start), endedAt: iso(end), minutes: Number(minutes) });
  });

  const xpEvents: XpEvent[] = [];
  focusSessions
    .filter((s) => new Date(s.startedAt) > addDays(now, -7))
    .forEach((s) => xpEvents.push({ id: `xp-${s.id}`, at: s.endedAt, amount: xpForFocus(s.minutes), source: "focus", refId: s.id }));
  tasks
    .filter((t) => t.completedAt)
    .forEach((t) => xpEvents.push({ id: `xp-${t.id}`, at: t.completedAt!, amount: xpForTask(t), source: "task", refId: t.id }));

  const exercises: Exercise[] = [
    { id: "e-supino", name: "Supino inclinado", group: "Peito superior", kind: "strength" },
    { id: "e-crucifixo", name: "Crucifixo inclinado", group: "Peito superior", kind: "strength" },
    { id: "e-desenv", name: "Desenvolvimento", group: "Deltoides", kind: "strength" },
    { id: "e-lateral", name: "Elevação lateral", group: "Deltoides", kind: "strength" },
    { id: "e-puxada", name: "Puxada frontal", group: "Costas", kind: "strength" },
    { id: "e-remada", name: "Remada curvada", group: "Costas", kind: "strength" },
    { id: "e-agacha", name: "Agachamento livre", group: "Pernas", kind: "strength" },
    { id: "e-leg", name: "Leg press", group: "Pernas", kind: "strength" },
    { id: "e-esteira", name: "Esteira", group: "Cardio", kind: "cardio" },
    { id: "e-bike", name: "Bike", group: "Cardio", kind: "cardio" },
  ];

  const exerciseLogs: ExerciseLog[] = [];
  const startLoads: Record<string, number> = {
    "e-supino": 24, "e-crucifixo": 10, "e-desenv": 14, "e-lateral": 6, "e-puxada": 40, "e-remada": 30, "e-agacha": 50, "e-leg": 120,
  };
  const split: Record<string, string[]> = {
    "0": [],
    "1": ["Peito superior", "Deltoides"],
    "2": ["Costas"],
    "3": ["Pernas"],
    "4": ["Costas"],
    "5": ["Peito superior", "Deltoides"],
    "6": [],
  };
  for (let back = 35; back >= 1; back--) {
    const date = addDays(now, -back);
    const groups = split[String(date.getDay())];
    if (!groups.length) continue;
    const progress = Math.floor((35 - back) / 7);
    exercises
      .filter((e) => e.kind === "strength" && groups.includes(e.group))
      .forEach((e) => {
        exerciseLogs.push({
          id: `log-${e.id}-${back}`,
          exerciseId: e.id,
          date: toISODate(date),
          load: startLoads[e.id] + progress * (e.id === "e-leg" ? 10 : 2),
          reps: 10,
          sets: 3,
        });
      });
    exerciseLogs.push({ id: `log-cardio-${back}`, exerciseId: "e-esteira", date: toISODate(date), minutes: 15, distanceKm: 2 + progress * 0.1 });
  }

  const trainingPlans: TrainingPlan[] = [
    {
      id: TRAINING_PLAN_ID,
      spotifyUrl: "https://open.spotify.com/search/treino",
      youtubeUrl: null,
      split,
      finishers: [
        { id: "fin-cardio", text: "15 minutos de cardio" },
        { id: "fin-along", text: "5 minutos de alongamento" },
      ],
      finisherDone: {},
    },
  ];

  const xpToday = xpEvents.filter((e) => toISODate(new Date(e.at)) === today).reduce((s, e) => s + e.amount, 0);

  return {
    profile: {
      id: "u-1",
      displayName: "Ana Lima",
      totalXp: 1900 + xpToday,
      lastActivityAt: iso(now),
    },
    modules,
    folders,
    tasks,
    notes,
    goals,
    habits,
    inbox,
    focusSessions,
    xpEvents,
    exercises,
    exerciseLogs,
    trainingPlans,
  };
}

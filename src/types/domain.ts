/**
 * Modelo de domínio do Prisma.
 * Espelha as tabelas em supabase/migrations/0001_schema_inicial.sql.
 */

export type ID = string;

/** "YYYY-MM-DD" no fuso do usuário */
export type ISODate = string;

/** "HH:mm" (24h) */
export type ClockTime = string;

export type ModuleTemplate = "blank" | "study" | "code" | "training";

/** Categoria dos pontos nas batalhas. */
export type Area = "estudo" | "trabalho" | "treino" | "alimentacao" | "sono" | "pessoal";

export type ModuleColor = "blue" | "yellow" | "green" | "violet" | "coral" | "slate";

export type ModuleIcon =
  | "sigma"
  | "book"
  | "code"
  | "briefcase"
  | "dumbbell"
  | "folder"
  | "lightbulb";

export interface Module {
  id: ID;
  name: string;
  color: ModuleColor;
  icon: ModuleIcon;
  template: ModuleTemplate;
  position: number;
  /** Categoria dos pontos (sem valor = a do modelo). */
  area?: Area;
}

/** Pastas aninhadas até 3 níveis (depth 1..3). */
export interface Folder {
  id: ID;
  moduleId: ID;
  parentId: ID | null;
  name: string;
  depth: 1 | 2 | 3;
}

export interface Subtask {
  id: ID;
  title: string;
  done: boolean;
}

export interface Recurrence {
  /** Regra no formato RRULE (RFC 5545), ex.: "FREQ=WEEKLY;BYDAY=MO" */
  rule: string;
  /** Texto exibido na interface, ex.: "Toda segunda" */
  label: string;
  streak: number;
}

export interface Task {
  id: ID;
  title: string;
  /** Módulo da tarefa. null = tarefa avulsa, sem módulo. */
  moduleId: ID | null;
  folderId: ID | null;
  tags: string[];
  /** Matriz de Eisenhower */
  urgent: boolean;
  important: boolean;
  dueDate: ISODate | null;
  /** Horário marcado no dia. Sem horário = "quando der". */
  scheduledTime: ClockTime | null;
  estimateMin: number | null;
  subtasks: Subtask[];
  /** Tarefa que precisa estar concluída antes desta. */
  blockedById: ID | null;
  recurrence: Recurrence | null;
  /** Quantas vezes foi adiada (alimenta a revisão semanal). */
  postponedCount: number;
  completedAt: string | null;
  /** Próxima ocorrência criada ao concluir uma tarefa recorrente. */
  spawnedNextId?: ID | null;
  notes?: string;
  createdAt: string;
}

export interface Note {
  id: ID;
  moduleId: ID;
  folderId: ID | null;
  title: string;
  body: string;
  updatedAt: string;
}

export interface Goal {
  id: ID;
  moduleId: ID;
  folderId: ID | null;
  title: string;
  current: number;
  target: number;
  unit: string;
  dueDate: ISODate | null;
}

export interface Habit {
  id: ID;
  name: string;
  /** Dias da semana em que o hábito vale (0 = domingo). Todos = todo dia. */
  days: number[];
  /** Módulo ao qual o hábito foi vinculado depois de criado (opcional). */
  moduleId: ID | null;
  /** Dias em que o hábito foi feito. */
  checks: ISODate[];
  createdAt: string;
}

export interface InboxItem {
  id: ID;
  kind: "idea";
  text: string;
  createdAt: string;
}

export interface FocusSession {
  id: ID;
  taskId: ID | null;
  startedAt: string;
  endedAt: string;
  minutes: number;
}

export interface XpEvent {
  id: ID;
  at: string;
  amount: number;
  source: "task" | "habit" | "focus" | "workout";
  refId: ID | null;
  /** Categoria em que os pontos contam nas batalhas. */
  area?: Area;
  /** Hábitos: o dia marcado (só conta na batalha se for do período dela). */
  day?: ISODate;
}

export interface Profile {
  id: ID;
  displayName: string;
  totalXp: number;
  /** Último registro de atividade. */
  lastActivityAt: string;
}

/* ---------- Treino ---------- */

export interface Exercise {
  id: ID;
  name: string;
  /** Grupo muscular ou "Cardio" */
  group: string;
  kind: "strength" | "cardio";
}

export interface ExerciseLog {
  id: ID;
  exerciseId: ID;
  date: ISODate;
  load?: number | null;
  reps?: number | null;
  sets?: number | null;
  minutes?: number | null;
  distanceKm?: number | null;
}

export interface Finisher {
  id: ID;
  text: string;
}

/** Plano de treino do usuário (um só, id = TRAINING_PLAN_ID). */
export interface TrainingPlan {
  id: ID;
  /** Playlists de treino, abertas pelo botão de música */
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  /** Dia da semana (0 = domingo) → grupos musculares */
  split: Record<string, string[]>;
  finishers: Finisher[];
  /** Data → ids dos finalizadores concluídos naquele dia */
  finisherDone: Record<ISODate, ID[]>;
}

export interface Workspace {
  profile: Profile;
  modules: Module[];
  folders: Folder[];
  tasks: Task[];
  notes: Note[];
  goals: Goal[];
  habits: Habit[];
  inbox: InboxItem[];
  focusSessions: FocusSession[];
  xpEvents: XpEvent[];
  exercises: Exercise[];
  exerciseLogs: ExerciseLog[];
  trainingPlans: TrainingPlan[];
}

/** Coleções que podem ser salvas/excluídas de forma genérica. */
export type CollectionKey = Exclude<keyof Workspace, "profile">;

export type EntityOf<K extends CollectionKey> = Workspace[K][number];

export type Quadrant = "do" | "schedule" | "delegate" | "eliminate";

export const TRAINING_PLAN_ID = "treino";

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

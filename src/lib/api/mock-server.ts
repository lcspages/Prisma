/**
 * Servidor de demonstração.
 * Roda no navegador, com latência de rede simulada, e guarda os dados no
 * localStorage para eles sobreviverem a recargas (simulando a nuvem).
 * Executa as mesmas operações de lib/ops.ts que o cliente usa no modo otimista.
 */
import type { Habit, Module, TrainingPlan, Workspace } from "@/types/domain";
import { ALL_DAYS, TRAINING_PLAN_ID } from "@/types/domain";
import { applyDelta, runOp } from "@/lib/ops";
import { createSeed } from "./seed";
import type { PrismaApi } from "./types";

const STORAGE_KEY = "prisma:demo-db:v2";

/** Probabilidade de uma escrita falhar. Suba para testar o desfazer automático. */
const FAILURE_RATE = 0;

let db: Workspace | null = null;

const clone = <T>(value: T): T => structuredClone(value);

function latency(write = false): Promise<void> {
  const ms = 120 + Math.random() * 260;
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (write && Math.random() < FAILURE_RATE) reject(new Error("falha de rede simulada"));
      else resolve();
    }, ms),
  );
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* sem armazenamento: os dados valem só nesta aba */
  }
}

/**
 * Atualiza dados salvos por versões anteriores do app:
 * hábitos ganham dias da semana e vínculo opcional; o treino deixa de
 * pertencer a um módulo e vira um plano único com a playlist.
 */
function migrate(ws: Workspace): Workspace {
  const legacyModules = ws.modules as Array<Module & { playlistUrl?: string | null }>;
  const playlist = legacyModules.find((m) => m.playlistUrl)?.playlistUrl ?? null;
  const modules = legacyModules.map(({ playlistUrl: _drop, ...m }) => m);
  const habits = ws.habits.map(
    (h): Habit => ({ ...h, days: Array.isArray(h.days) && h.days.length ? h.days : ALL_DAYS, moduleId: h.moduleId ?? null }),
  );
  const exercises = ws.exercises.map((e) => {
    const { moduleId: _drop, ...rest } = e as typeof e & { moduleId?: string };
    return rest;
  });
  type LegacyPlan = TrainingPlan & { playlistUrl?: string | null };
  let plans = ws.trainingPlans as LegacyPlan[];
  if (!plans.some((p) => p.id === TRAINING_PLAN_ID)) {
    const first = plans[0];
    plans = [
      first
        ? { ...first, id: TRAINING_PLAN_ID, playlistUrl: first.playlistUrl ?? playlist }
        : { id: TRAINING_PLAN_ID, spotifyUrl: null, youtubeUrl: null, split: {}, finishers: [], finisherDone: {} },
    ];
  }
  // Um link único de playlist vira Spotify ou YouTube, conforme o endereço.
  const trainingPlans: TrainingPlan[] = plans.map(({ playlistUrl, ...p }) => {
    const legacy = playlistUrl ?? null;
    const isYoutube = Boolean(legacy && /youtu/i.test(legacy));
    return {
      ...p,
      spotifyUrl: p.spotifyUrl ?? (legacy && !isYoutube ? legacy : null),
      youtubeUrl: p.youtubeUrl ?? (legacy && isYoutube ? legacy : null),
    };
  });
  // Interrupções deixaram de existir: o que foi anotado continua, como ideia.
  const inbox = ws.inbox.map((i) => ({ ...i, kind: "idea" as const }));
  return { ...ws, modules, habits, exercises, trainingPlans, inbox };
}

function getDb(): Workspace {
  if (db) return db;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Workspace;
      if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.trainingPlans)) {
        db = migrate(parsed);
        persist();
      }
    }
  } catch {
    /* dados corrompidos: recomeça do exemplo */
  }
  if (!db) {
    db = createSeed();
    persist();
  }
  return db;
}

export const mockApi: PrismaApi = {
  async getWorkspace() {
    await latency();
    return clone(getDb());
  },

  async run(name, args, ctx) {
    await latency(true);
    const current = getDb();
    const delta = runOp(current, name, args, ctx);
    db = applyDelta(current, delta);
    persist();
    return clone(delta);
  },

  async reset() {
    await latency();
    db = createSeed();
    persist();
    return clone(db);
  },
};

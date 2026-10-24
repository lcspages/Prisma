import { mockApi } from "./mock-server";
import { remoteApi } from "./remote-api";
import type { PrismaApi } from "./types";

export type { PrismaApi } from "./types";

/**
 * Ponto único de acesso aos dados.
 * Padrão: nuvem (Supabase, pelo servidor do Prisma).
 * NEXT_PUBLIC_DATA_SOURCE=mock usa os dados de exemplo no navegador (só para testes).
 */
export const api: PrismaApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "mock" ? mockApi : remoteApi;

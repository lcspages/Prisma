import type { Workspace } from "@/types/domain";
import type { Delta, OpArgs, OpContext, OpName } from "@/lib/ops";

/**
 * Contrato entre a interface e a nuvem.
 * Toda escrita é uma operação nomeada (ver lib/ops.ts) que devolve
 * o Delta oficial do servidor; ele substitui o que a tela aplicou na hora.
 */
export interface PrismaApi {
  getWorkspace(): Promise<Workspace>;
  run<N extends OpName>(name: N, args: OpArgs<N>, ctx: OpContext): Promise<Delta>;
  /** Só no modo de demonstração: volta aos dados de exemplo. */
  reset?(): Promise<Workspace>;
}

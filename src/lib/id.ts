/**
 * IDs gerados no cliente. Assim a interface já conhece o id definitivo
 * antes da resposta da nuvem (o Postgres aceita uuid enviado pelo cliente),
 * e não existe a troca de id temporário por id real.
 */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

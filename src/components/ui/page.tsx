import { cn } from "@/lib/cn";

/** Moldura padrão das páginas: largura máxima e respiro lateral. */
export function Page({ children, className, wide = false }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={cn("mx-auto w-full px-4 pt-6 md:px-8 md:pt-2", wide ? "max-w-[1320px]" : "max-w-[1080px]", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-display font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-lead text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  id,
  title,
  count,
  aside,
}: {
  id?: string;
  title: string;
  count?: number;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="text-lead font-semibold text-ink">
        {title}
        {typeof count === "number" && <span className="tabular ml-2 text-body font-medium text-ink-3">{count}</span>}
      </h2>
      {aside}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-dashed border-line-strong px-6 py-10 text-center", className)}>
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-ink-2">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  label,
  tone = "primary",
  className,
}: {
  value: number;
  max: number;
  label: string;
  tone?: "primary" | "accent" | "ink";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          tone === "primary" && "bg-primary",
          tone === "accent" && "bg-accent",
          tone === "ink" && "bg-[#141414]",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Carregando: blocos cinza no lugar do conteúdo. */
export function PageSkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Carregando" className="space-y-4">
        <div className="h-9 w-64 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-5 w-80 max-w-full animate-pulse rounded-lg bg-surface-2" />
        <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl bg-surface-2" />
          ))}
        </div>
      </div>
    </Page>
  );
}

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "h-10 w-full rounded-xl border border-line bg-canvas px-3 text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-primary disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-meta font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="text-meta text-ink-3">{hint}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref,
) {
  return <select ref={ref} className={cn(inputClass, "pr-8", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(inputClass, "h-auto min-h-24 resize-y py-2.5 leading-6", className)} {...props} />;
  },
);

/** Botão de alternância (chip) usado em escolhas rápidas. */
export function Chip({
  selected,
  onClick,
  children,
  className,
  ...rest
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-ink bg-ink text-canvas"
          : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

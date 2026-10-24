import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  // Texto #141414 sobre o azul: 6,2:1 de contraste.
  primary: "bg-primary text-on-primary hover:bg-[color-mix(in_oklab,var(--primary),black_10%)]",
  secondary: "bg-surface-2 text-ink hover:bg-surface-3",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  accent: "bg-accent text-on-accent hover:bg-[color-mix(in_oklab,var(--accent),black_8%)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 rounded-lg px-3 text-meta",
  md: "h-10 rounded-[10px] px-4 text-body",
};

/** Mesmo visual do Button, para usar em <Link>. */
export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});

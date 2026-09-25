import Link from "next/link";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "brand" | "dark" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

const variants: Record<ButtonVariant, string> = {
  // Conversion actions (search, reserve, submit booking).
  primary: "bg-sunset-600 text-white hover:bg-sunset-700 shadow-sm",
  // Standard primary actions.
  brand: "bg-lagoon-700 text-white hover:bg-lagoon-800 shadow-sm",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
  secondary: "bg-surface text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-950",
  danger: "bg-danger-600 text-white hover:bg-danger-700",
  link: "text-lagoon-700 underline-offset-4 hover:underline px-0 h-auto active:scale-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-sm px-3 text-sm",
  md: "h-11 rounded-md px-5 text-[0.9375rem]",
  lg: "h-13 rounded-md px-6 text-base",
  icon: "h-10 w-10 rounded-full",
};

export function buttonClasses({ variant = "brand", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], variant === "link" ? "" : sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; icon?: ReactNode };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, icon, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses({ variant, size, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode };

export function ButtonLink({ variant, size, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {icon}
      {children}
    </Link>
  );
}

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed border-ink-200 bg-surface px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-lagoon-50 text-lagoon-700 [&_svg]:size-6">{icon}</div>}
      <h3 className="text-h3 font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-ink-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const tones = {
  info: { cls: "bg-lagoon-50 text-lagoon-900 ring-lagoon-200", Icon: Info },
  success: { cls: "bg-success-50 text-success-700 ring-success-600/20", Icon: CheckCircle2 },
  warning: { cls: "bg-warning-50 text-warning-700 ring-warning-600/20", Icon: AlertTriangle },
  danger: { cls: "bg-danger-50 text-danger-700 ring-danger-600/20", Icon: XCircle },
};

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: ReactNode; children?: ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-md p-4 text-sm ring-1 ring-inset", cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}

const badgeTones = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-lagoon-50 text-lagoon-800",
  accent: "bg-sunset-50 text-sunset-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  dark: "bg-ink-900/85 text-white backdrop-blur",
  light: "bg-white/95 text-ink-900 shadow-sm backdrop-blur",
};

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof badgeTones; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeTones[tone], className)}>{children}</span>;
}

export function Card({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" | "aside" }) {
  return <Tag className={cn("rounded-xl bg-surface p-5 shadow-card ring-1 ring-ink-200/60 sm:p-6", className)}>{children}</Tag>;
}

"use client";

import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export const inputClasses =
  "block w-full rounded-md border-0 bg-surface px-3.5 py-2.5 text-[0.9375rem] text-ink-950 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 transition-shadow focus:outline-none focus:ring-2 focus:ring-lagoon-500 disabled:bg-ink-50 disabled:text-ink-500 aria-[invalid=true]:ring-danger-600 min-h-11";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink-800", className)} {...props} />;
}

export function FieldError({ id, messages }: { id?: string; messages?: string[] | string }) {
  const list = typeof messages === "string" ? [messages] : messages;
  if (!list?.length) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger-700" role="alert">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {list[0]}
    </p>
  );
}

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string[] | string;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
};

/** Accessible form field: wires label, hint and error to the control. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error?.length ? `${id}-error` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-ink-500">(optional)</span>}
      </Label>
      {children({ id, "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined, "aria-invalid": errorId ? true : undefined })}
      {hint && !errorId && (
        <p id={hintId} className="mt-1.5 text-sm text-ink-500">
          {hint}
        </p>
      )}
      <FieldError id={errorId} messages={error} />
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClasses, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputClasses, "min-h-28 resize-y leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        inputClasses,
        "appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2377736b' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    />
  );
});

export function Checkbox({ label, description, className, ...props }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 rounded border-ink-300 accent-lagoon-700 focus-visible:shadow-[var(--shadow-focus)]"
        {...props}
      />
      <label htmlFor={id} className="text-sm leading-snug text-ink-700">
        <span className="font-medium text-ink-900">{label}</span>
        {description && <span className="mt-0.5 block text-ink-500">{description}</span>}
      </label>
    </div>
  );
}

"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideTitle?: boolean;
};

const spring = { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.8 };

/** Accessible modal dialog (focus trap, Esc to close, labelled). */
export function Modal({ open, onOpenChange, title, description, children, footer, className, hideTitle }: BaseProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <m.div className="fixed inset-0 z-50 bg-ink-950/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
            </RadixDialog.Overlay>
            <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto sm:place-items-center sm:p-6">
              <RadixDialog.Content asChild>
                <m.div
                  className={cn("relative w-full max-w-lg rounded-t-2xl bg-surface shadow-float focus:outline-none sm:rounded-2xl", className)}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.98 }}
                  transition={spring}
                >
                  <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
                    <div>
                      <RadixDialog.Title className={cn("font-display text-lg font-semibold", hideTitle && "sr-only")}>{title}</RadixDialog.Title>
                      {description ? (
                        <RadixDialog.Description className="mt-1 text-sm text-ink-600">{description}</RadixDialog.Description>
                      ) : (
                        <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
                      )}
                    </div>
                    <RadixDialog.Close className="-mr-2 grid size-9 place-items-center rounded-full text-ink-600 hover:bg-ink-100" aria-label="Close">
                      <X className="size-5" />
                    </RadixDialog.Close>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
                  {footer && <div className="safe-bottom flex flex-col-reverse gap-2 border-t border-ink-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
                </m.div>
              </RadixDialog.Content>
            </div>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

/** Side drawer on desktop, bottom sheet on mobile. */
export function Drawer({ open, onOpenChange, title, description, children, footer, className, side = "right" }: BaseProps & { side?: "right" | "left" }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <m.div className="fixed inset-0 z-50 bg-ink-950/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <m.div
                className={cn(
                  "fixed z-50 flex flex-col bg-surface shadow-float focus:outline-none",
                  "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl",
                  side === "right" ? "sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-2xl" : "sm:inset-y-0 sm:left-0 sm:right-auto sm:max-h-none sm:w-[360px] sm:rounded-none sm:rounded-r-2xl",
                  className,
                )}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={spring}
              >
                <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
                  <div>
                    <RadixDialog.Title className="font-display text-lg font-semibold">{title}</RadixDialog.Title>
                    {description ? (
                      <RadixDialog.Description className="text-sm text-ink-600">{description}</RadixDialog.Description>
                    ) : (
                      <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
                    )}
                  </div>
                  <RadixDialog.Close className="-mr-2 grid size-9 place-items-center rounded-full text-ink-600 hover:bg-ink-100" aria-label="Close">
                    <X className="size-5" />
                  </RadixDialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
                {footer && <div className="safe-bottom flex gap-2 border-t border-ink-100 px-5 py-3">{footer}</div>}
              </m.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

/** Confirmation dialog for destructive or important actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  onConfirm,
  pending,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "brand";
  onConfirm: () => void;
  pending?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className="h-11 rounded-md px-5 text-sm font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              "h-11 rounded-md px-5 text-sm font-semibold text-white disabled:opacity-60",
              tone === "danger" ? "bg-danger-600 hover:bg-danger-700" : "bg-lagoon-700 hover:bg-lagoon-800",
            )}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export function SubmitButton({ children, variant = "brand", size = "md", className, pendingLabel }: { children: React.ReactNode; variant?: ButtonVariant; size?: ButtonSize; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} loading={pending} className={className}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/server/errors";
import { Alert } from "@/components/ui/feedback";

/** Shows a form-level error banner and a success toast for an action result. */
export function FormStatus({ state, successToast = true }: { state: ActionResult<unknown>; successToast?: boolean }) {
  const last = useRef(state);
  useEffect(() => {
    if (state !== last.current && state.ok && state.message && successToast) toast.success(state.message);
    last.current = state;
  }, [state, successToast]);
  if (!state.ok && state.error) return <Alert tone="danger">{state.error}</Alert>;
  return null;
}

export const initialActionState: ActionResult<never> = { ok: false, error: "" };

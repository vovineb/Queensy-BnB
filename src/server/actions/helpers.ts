import "server-only";
import { cookies } from "next/headers";
import type { z } from "zod";
import { AppError } from "@/server/errors";
import { fieldErrors } from "@/lib/validation";
import { VISITOR_COOKIE } from "@/lib/constants";

export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value;
  }
  return out;
}

/** Parses FormData with a zod schema, throwing a VALIDATION AppError with field messages. */
export function parseForm<S extends z.ZodType>(schema: S, formData: FormData | Record<string, unknown>): z.infer<S> {
  const input = formData instanceof FormData ? formObject(formData) : formData;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    const first = Object.values(errors).find((v) => v?.length)?.[0] ?? parsed.error.issues[0]?.message ?? "Please check the form";
    throw new AppError("VALIDATION", first, errors);
  }
  return parsed.data;
}

export async function visitorId(): Promise<string | undefined> {
  return (await cookies()).get(VISITOR_COOKIE)?.value;
}

// Typed domain errors. Services throw these; actions/routes translate them to
// user-facing messages and HTTP status codes. Never leak internals to users.

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "DATES_UNAVAILABLE"
  | "PRICE_CHANGED"
  | "INVALID_TRANSITION";

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  DATES_UNAVAILABLE: 409,
  PRICE_CHANGED: 409,
  INVALID_TRANSITION: 409,
};

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "AppError";
  }
  get status() {
    return STATUS[this.code];
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

/** Result shape returned by server actions to forms. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined>; code?: AppErrorCode };

export function toActionError(error: unknown): ActionResult<never> {
  if (isAppError(error)) return { ok: false, error: error.message, fieldErrors: error.fieldErrors, code: error.code };
  console.error("[action] unexpected error", error);
  return { ok: false, error: "Something went wrong on our side. Please try again." };
}

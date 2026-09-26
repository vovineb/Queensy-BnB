"use server";

import { redirect } from "next/navigation";
import { toActionError, type ActionResult } from "@/server/errors";
import { destroySession } from "@/server/auth/session";
import { safeNextPath } from "@/server/auth/guards";
import { clientIp } from "@/server/request";
import * as accounts from "@/server/services/accounts";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation";
import { parseForm, visitorId } from "./helpers";

export async function signUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let next: string;
  try {
    const input = parseForm(signUpSchema, formData);
    await accounts.signUp(input, { ip: await clientIp(), visitorId: await visitorId() });
    next = safeNextPath(formData.get("next"), "/account");
  } catch (error) {
    return toActionError(error);
  }
  redirect(next);
}

export async function signInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let destination: string;
  try {
    const { email, password } = parseForm(signInSchema, formData);
    const user = await accounts.signIn(email, password, { ip: await clientIp(), visitorId: await visitorId() });
    const fallback = user.role === "ADMIN" ? "/admin" : "/account";
    destination = safeNextPath(formData.get("next"), fallback);
  } catch (error) {
    return toActionError(error);
  }
  redirect(destination);
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { email } = parseForm(forgotPasswordSchema, formData);
    await accounts.requestPasswordReset(email, { ip: await clientIp() });
    return { ok: true, message: "If an account exists for that email, a reset link is on its way. It expires in 1 hour." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { token, password } = parseForm(resetPasswordSchema, formData);
    await accounts.resetPassword(token, password);
  } catch (error) {
    return toActionError(error);
  }
  redirect("/account?reset=1");
}

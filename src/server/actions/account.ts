"use server";

import { revalidatePath } from "next/cache";
import { toActionError, type ActionResult } from "@/server/errors";
import { requireUser } from "@/server/auth/guards";
import * as accounts from "@/server/services/accounts";
import { markNotificationsRead } from "@/server/services/notifications";
import { changePasswordSchema, marketingPreferencesSchema, profileSchema } from "@/lib/validation";
import { parseForm } from "./helpers";

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const input = parseForm(profileSchema, formData);
    await accounts.updateProfile(user.id, input);
    revalidatePath("/account", "layout");
    return { ok: true, message: "Profile saved" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const { currentPassword, password } = parseForm(changePasswordSchema, formData);
    await accounts.changePassword(user.id, currentPassword, password);
    return { ok: true, message: "Password updated. Other devices have been signed out." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateMarketingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const prefs = parseForm(marketingPreferencesSchema, formData);
    await accounts.updateMarketingPreferences(user.id, prefs);
    revalidatePath("/account/privacy");
    return { ok: true, message: "Communication preferences saved" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resendVerificationAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.emailVerifiedAt) return { ok: true, message: "Your email is already verified." };
    await accounts.sendVerificationEmail(user.id, user.email, user.name);
    return { ok: true, message: `We've sent a new link to ${user.email}.` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markNotificationsRead(user.id, ids);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

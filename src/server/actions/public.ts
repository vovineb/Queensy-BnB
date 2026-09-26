"use server";

import { toActionError, type ActionResult } from "@/server/errors";
import { clientIp } from "@/server/request";
import { submitInquiry, subscribeNewsletter } from "@/server/services/leads";
import { inquirySchema, newsletterSchema } from "@/lib/validation";
import { parseForm } from "./helpers";

export async function submitInquiryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const input = parseForm(inquirySchema, formData);
    if (input.website) return { ok: true, message: "Thanks — we'll be in touch soon." }; // honeypot
    await submitInquiry({ ...input, propertyId: input.propertyId || undefined }, { ip: await clientIp() });
    return { ok: true, message: "Thanks — your message is with our team. We usually reply within a few hours." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function subscribeNewsletterAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const input = parseForm(newsletterSchema, formData);
    if (input.website) return { ok: true, message: "You're subscribed." };
    await subscribeNewsletter(input.email, { ip: await clientIp() });
    return { ok: true, message: "You're subscribed. You can unsubscribe any time." };
  } catch (error) {
    return toActionError(error);
  }
}

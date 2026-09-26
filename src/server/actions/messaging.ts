"use server";

import { redirect } from "next/navigation";
import { toActionError, type ActionResult } from "@/server/errors";
import { requireUser } from "@/server/auth/guards";
import * as messaging from "@/server/services/messaging";
import { track } from "@/server/services/analytics";
import { messageBodySchema, newConversationSchema } from "@/lib/validation";
import { parseForm, visitorId } from "./helpers";

export async function startConversationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let id: string;
  try {
    const user = await requireUser();
    const input = parseForm(newConversationSchema, formData);
    const convo = await messaging.startConversation(user, {
      ...input,
      propertyId: input.propertyId || undefined,
      bookingId: input.bookingId || undefined,
    });
    id = convo.id;
    const vid = await visitorId();
    if (vid) await track({ name: "message_sent", visitorId: vid, userId: user.id, propertyId: input.propertyId || null });
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/account/messages/${id}`);
}

export async function sendMessageAction(conversationId: string, body: string): Promise<ActionResult<{ id: string; createdAt: string }>> {
  try {
    const user = await requireUser();
    const text = messageBodySchema.parse(body);
    const message = await messaging.sendMessage(user, conversationId, text);
    const vid = await visitorId();
    if (vid && user.role !== "ADMIN") await track({ name: "message_sent", visitorId: vid, userId: user.id });
    return { ok: true, data: { id: message.id, createdAt: message.createdAt.toISOString() } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markReadAction(conversationId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await messaging.markConversationRead(user, conversationId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

/** Fetches a conversation thread for the realtime client to refresh after events. */
export async function fetchThreadAction(conversationId: string) {
  const user = await requireUser();
  const convo = await messaging.getConversation(user, conversationId);
  return {
    status: convo.status,
    customerLastReadAt: convo.customerLastReadAt?.toISOString() ?? null,
    staffLastReadAt: convo.staffLastReadAt?.toISOString() ?? null,
    messages: convo.messages.map((m) => ({ id: m.id, body: m.body, fromStaff: m.fromStaff, createdAt: m.createdAt.toISOString(), senderName: m.sender?.name ?? null })),
  };
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { AlertCircle, Check, CheckCheck, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { useRealtime } from "@/hooks/use-realtime";
import { fetchThreadAction, markReadAction, sendMessageAction } from "@/server/actions/messaging";

export type ChatMessage = { id: string; body: string; fromStaff: boolean; createdAt: string; senderName: string | null; status?: "sending" | "failed" };

type Props = {
  conversationId: string;
  viewer: "customer" | "staff";
  initialMessages: ChatMessage[];
  initialOtherReadAt: string | null;
  closed?: boolean;
  counterpartName: string;
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

/** Realtime chat: optimistic sends, live delivery, typing indicator, read receipts. */
export function ChatThread({ conversationId, viewer, initialMessages, initialOtherReadAt, closed, counterpartName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [otherReadAt, setOtherReadAt] = useState(initialOtherReadAt);
  const [typing, setTyping] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTypingSent = useRef(0);
  const tempSeq = useRef(0);
  const mine = (msg: ChatMessage) => (viewer === "staff" ? msg.fromStaff : !msg.fromStaff);

  const refresh = useCallback(async () => {
    const thread = await fetchThreadAction(conversationId);
    setMessages((prev) => [...thread.messages, ...prev.filter((p) => p.status === "failed")]);
    setOtherReadAt(viewer === "staff" ? thread.customerLastReadAt : thread.staffLastReadAt);
  }, [conversationId, viewer]);

  const markRead = useCallback(() => {
    if (document.visibilityState === "visible") void markReadAction(conversationId);
  }, [conversationId]);

  useEffect(() => {
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [markRead]);

  useRealtime(
    [`conversation:${conversationId}`],
    (type, data) => {
      if (type === "message") {
        void refresh().then(markRead);
        setTyping(null);
      } else if (type === "typing" && data.by !== viewer) {
        setTyping(String(data.name ?? counterpartName));
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 4000);
      } else if (type === "read" && data.by !== viewer) {
        setOtherReadAt(String(data.at));
      }
    },
    { onReconnect: () => void refresh() },
  );

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  const send = async (body: string, retryId?: string) => {
    const text = body.trim();
    if (!text) return;
    const tempId = retryId ?? `temp-${++tempSeq.current}`;
    const optimistic: ChatMessage = { id: tempId, body: text, fromStaff: viewer === "staff", createdAt: new Date().toISOString(), senderName: null, status: "sending" };
    setMessages((prev) => (retryId ? prev.map((m) => (m.id === retryId ? optimistic : m)) : [...prev, optimistic]));
    setDraft("");
    const result = await sendMessageAction(conversationId, text);
    if (result.ok && result.data) {
      const saved = result.data;
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev.filter((m) => m.id !== tempId) : prev.map((m) => (m.id === tempId ? { ...m, id: saved.id, createdAt: saved.createdAt, status: undefined } : m))));
    } else {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
    }
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    if (Date.now() - lastTypingSent.current > 2500 && value.trim()) {
      lastTypingSent.current = Date.now();
      void fetch("/api/realtime/typing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId }) }).catch(() => undefined);
    }
  };

  const lastMine = [...messages].reverse().find((msg) => mine(msg) && !msg.status);
  const seen = Boolean(lastMine && otherReadAt && new Date(otherReadAt) >= new Date(lastMine.createdAt));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-5" role="log" aria-live="polite" aria-label="Messages">
        {messages.map((msg, i) => {
          const own = mine(msg);
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
          const grouped = prev && !newDay && mine(prev) === own && new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
          return (
            <div key={msg.id}>
              {newDay && <p className="my-4 text-center text-xs font-medium text-ink-500">{dayLabel(msg.createdAt)}</p>}
              <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className={cn("flex", own ? "justify-end" : "justify-start", !grouped && "mt-3")}>
                <div className={cn("max-w-[85%] sm:max-w-[70%]")}>
                  {!own && !grouped && <p className="mb-1 ml-1 text-xs font-medium text-ink-500">{msg.senderName ?? counterpartName}</p>}
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed",
                      own ? "rounded-br-md bg-lagoon-700 text-white" : "rounded-bl-md bg-surface text-ink-900 ring-1 ring-ink-200",
                      msg.status === "sending" && "opacity-70",
                      msg.status === "failed" && "bg-danger-600",
                    )}
                    title={formatDateTime(msg.createdAt)}
                  >
                    {msg.body}
                  </div>
                  {msg.status === "failed" ? (
                    <button type="button" onClick={() => send(msg.body, msg.id)} className="mt-1 flex items-center gap-1 text-xs font-medium text-danger-700">
                      <AlertCircle className="size-3.5" /> Not sent — tap to retry
                    </button>
                  ) : (
                    <p className={cn("mt-1 flex items-center gap-1 text-[0.6875rem] text-ink-500", own ? "justify-end" : "justify-start")}>
                      {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      {own && msg.id === lastMine?.id && (seen ? <><CheckCheck className="size-3.5 text-lagoon-600" /> Seen</> : <><Check className="size-3.5" /> Delivered</>)}
                      {msg.status === "sending" && " · Sending…"}
                    </p>
                  )}
                </div>
              </m.div>
            </div>
          );
        })}
        <AnimatePresence>
          {typing && (
            <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 text-sm text-ink-500">
              <span className="flex gap-1 rounded-2xl bg-surface px-3 py-3 ring-1 ring-ink-200" aria-hidden>
                {[0, 1, 2].map((d) => (
                  <m.span key={d} className="size-1.5 rounded-full bg-ink-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: d * 0.2 }} />
                ))}
              </span>
              {typing} is typing…
            </m.div>
          )}
        </AnimatePresence>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="safe-bottom border-t border-ink-200 bg-surface p-3 sm:p-4"
      >
        {closed && <p className="mb-2 text-xs text-ink-500">This conversation was marked resolved. Sending a message will reopen it.</p>}
        <div className="flex items-end gap-2">
          <label htmlFor={`draft-${conversationId}`} className="sr-only">Message</label>
          <textarea
            id={`draft-${conversationId}`}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Write a message…"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl bg-ink-50 px-4 py-2.5 text-[0.9375rem] ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-lagoon-500 [field-sizing:content]"
          />
          <button type="submit" disabled={!draft.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-lagoon-700 text-white transition hover:bg-lagoon-800 disabled:opacity-40" aria-label="Send message">
            <SendHorizontal className="size-5" />
          </button>
        </div>
        <p className="mt-1.5 hidden text-xs text-ink-400 sm:block">Enter to send · Shift + Enter for a new line</p>
      </form>
    </div>
  );
}

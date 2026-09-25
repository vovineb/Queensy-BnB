"use client";

import { useEffect, useRef } from "react";

export type RealtimeHandler = (type: string, data: Record<string, unknown>) => void;

const EVENT_TYPES = ["ready", "notification", "booking", "message", "typing", "read", "status", "changed", "inquiry"];

/**
 * Subscribes to server-sent realtime events. The browser's EventSource
 * reconnects automatically; `onReconnect` lets callers refetch anything
 * missed while disconnected.
 */
export function useRealtime(channels: string[], onEvent: RealtimeHandler, opts: { enabled?: boolean; onReconnect?: () => void } = {}) {
  const handler = useRef(onEvent);
  const reconnect = useRef(opts.onReconnect);
  handler.current = onEvent;
  reconnect.current = opts.onReconnect;
  const key = channels.join(",");
  const enabled = opts.enabled ?? true;

  useEffect(() => {
    if (!enabled || !key || typeof EventSource === "undefined") return;
    const source = new EventSource(`/api/realtime?channels=${encodeURIComponent(key)}`);
    let opened = false;
    const listeners = EVENT_TYPES.map((type) => {
      const fn = (e: MessageEvent) => {
        let data: Record<string, unknown> = {};
        try {
          data = JSON.parse(e.data);
        } catch {
          /* ignore */
        }
        if (type === "ready") {
          if (opened) reconnect.current?.();
          opened = true;
          return;
        }
        handler.current(type, data);
      };
      source.addEventListener(type, fn);
      return [type, fn] as const;
    });
    return () => {
      listeners.forEach(([type, fn]) => source.removeEventListener(type, fn));
      source.close();
    };
  }, [key, enabled]);
}

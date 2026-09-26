import "server-only";
import { Client } from "pg";
import { db } from "@/server/db";

// Realtime fan-out using Postgres LISTEN/NOTIFY.
// Any app instance can publish; every instance's hub receives the event and
// forwards it to its connected SSE clients subscribed to that channel.
//
// Channels:
//   user:<id>            notifications, booking updates, messages for a customer
//   admin                new bookings / messages / inquiries for staff
//   conversation:<id>    messages + typing indicators within a conversation
//   availability:<propId> a property's calendar changed (public)

export type RealtimeEvent = { channel: string; type: string; data?: Record<string, unknown> };
type Listener = (event: RealtimeEvent) => void;

const PG_CHANNEL = "qb_realtime";

class RealtimeHub {
  private client: Client | null = null;
  private connecting: Promise<void> | null = null;
  private listeners = new Map<string, Set<Listener>>();

  private async connect() {
    if (this.client) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      const client = new Client({ connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL });
      client.on("notification", (msg) => {
        if (!msg.payload) return;
        try {
          const event = JSON.parse(msg.payload) as RealtimeEvent;
          this.listeners.get(event.channel)?.forEach((fn) => fn(event));
        } catch {
          /* ignore malformed payloads */
        }
      });
      client.on("error", (err) => {
        console.error("[realtime] listener connection error", err.message);
        this.reset();
      });
      client.on("end", () => this.reset());
      await client.connect();
      await client.query(`LISTEN ${PG_CHANNEL}`);
      this.client = client;
    })().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private reset() {
    this.client = null;
    if (this.listeners.size > 0) setTimeout(() => void this.connect().catch(() => undefined), 2000);
  }

  async subscribe(channels: string[], listener: Listener): Promise<() => void> {
    await this.connect();
    for (const ch of channels) {
      if (!this.listeners.has(ch)) this.listeners.set(ch, new Set());
      this.listeners.get(ch)!.add(listener);
    }
    return () => {
      for (const ch of channels) {
        const set = this.listeners.get(ch);
        set?.delete(listener);
        if (set && set.size === 0) this.listeners.delete(ch);
      }
    };
  }
}

const globalForHub = globalThis as unknown as { realtimeHub?: RealtimeHub };
export const realtimeHub = globalForHub.realtimeHub ?? (globalForHub.realtimeHub = new RealtimeHub());

/** Publishes an event to all instances. Payloads stay small (ids only); clients refetch details. */
export async function publish(channel: string, type: string, data?: Record<string, unknown>): Promise<void> {
  const payload = JSON.stringify({ channel, type, data } satisfies RealtimeEvent);
  try {
    await db.$executeRaw`SELECT pg_notify(${PG_CHANNEL}, ${payload})`;
  } catch (error) {
    // Realtime is best-effort; the source of truth is already committed.
    console.error("[realtime] publish failed", error);
  }
}

"use client";

/** Sends a first-party analytics event. Fire-and-forget; never blocks the UI. */
export function trackEvent(name: string, data: { propertyId?: string; props?: Record<string, string | number | boolean | null> } = {}) {
  try {
    const body = JSON.stringify({ name, path: window.location.pathname, ...data });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    else void fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch {
    /* analytics must never break the page */
  }
}

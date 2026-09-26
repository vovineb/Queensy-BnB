"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Progressive fade-up on scroll. Content is always server-rendered visible
 * (crawlers, no-JS, fast LCP); only elements that start below the fold are
 * hidden on mount and revealed when they enter the viewport. Reduced motion
 * is handled by the global prefers-reduced-motion CSS rule.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "hidden" | "shown">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already visible: never hide
    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(state !== "static" && "transition-[opacity,transform] duration-500 ease-[var(--ease-out-soft)]", state === "hidden" && "translate-y-3 opacity-0", className)}
      style={state === "shown" ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

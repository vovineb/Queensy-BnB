"use client";

import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {/* Honour the OS "reduce motion" setting for every animation. */}
      <MotionConfig reducedMotion="user">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !border-ink-200 !shadow-float !font-sans",
              title: "!font-semibold !text-ink-950",
              description: "!text-ink-600",
            },
          }}
        />
      </MotionConfig>
    </LazyMotion>
  );
}

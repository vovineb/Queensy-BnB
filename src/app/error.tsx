"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-h1 font-bold">Something went wrong</h1>
        <p className="mt-3 text-ink-600">Sorry about that — it&apos;s on our side. Please try again; if it keeps happening, contact us{error.digest ? ` and mention code ${error.digest}` : ""}.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="dark" onClick={reset} icon={<RefreshCw className="size-4" />}>Try again</Button>
          <ButtonLink href="/" variant="secondary">Go home</ButtonLink>
        </div>
      </div>
    </main>
  );
}

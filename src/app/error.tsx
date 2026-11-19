"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted-strong">
        Sorry, we couldn&apos;t load this page. Please check your connection and try again.
        {error.digest && <span className="mt-2 block text-xs">Reference: {error.digest}</span>}
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <LinkButton href="/" variant="outline">
          Go home
        </LinkButton>
      </div>
    </main>
  );
}

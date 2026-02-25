"use client";

import { useEffect, useState } from "react";

const useMock =
  typeof window !== "undefined" &&
  (import.meta.env.VITE_USE_MOCK === "true" || (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== "false"));

export function MockBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!useMock);

  useEffect(() => {
    if (!useMock) {
      setReady(true);
      return;
    }
    import("../../mocks/browser").then(({ worker }) =>
      worker.start({ onUnhandledRequest: "bypass", quiet: true }).then(() => setReady(true))
    );
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  return <>{children}</>;
}

"use client";

import type { ReactNode } from "react";
import { AppQueryClientProvider } from "@/components/providers/query-client-provider";
import { CopilotProvider } from "@/components/providers/copilot-provider";
import { RunSessionProvider } from "@/context/run-session-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppQueryClientProvider>
      <RunSessionProvider>
        <CopilotProvider>{children}</CopilotProvider>
      </RunSessionProvider>
    </AppQueryClientProvider>
  );
}

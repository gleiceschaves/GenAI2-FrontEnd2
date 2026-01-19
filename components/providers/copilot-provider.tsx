"use client";

import { CopilotKit } from "@copilotkit/react-core";
import type { ReactNode } from "react";
import { COPILOT_RUNTIME_URL } from "@/lib/config";

export function CopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKit
      runtimeUrl={COPILOT_RUNTIME_URL}
      showDevConsole={process.env.NODE_ENV !== "production"}
    >
      {children}
    </CopilotKit>
  );
}

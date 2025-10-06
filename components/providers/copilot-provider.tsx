"use client";

import { CopilotKit } from "@copilotkit/react-core";
import type { ReactNode } from "react";

const DEFAULT_AGENT_NAME = "reports-agent";

export function CopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKit agent={DEFAULT_AGENT_NAME} showDevConsole={process.env.NODE_ENV !== "production"}>
      {children}
    </CopilotKit>
  );
}

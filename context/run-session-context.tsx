"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { Report, RunSnapshot } from "@/lib/api/types";

type SessionReport = Pick<Report, "id" | "name" | "latestSignatureVersion">;

interface RunSessionState {
  report: SessionReport | null;
  runId: string | null;
  snapshot: RunSnapshot | null;
  isStreaming: boolean;
  lastEventAt: string | null;
}

type RunSessionAction =
  | { type: "setReport"; payload: SessionReport | null }
  | { type: "setRun"; payload: { runId: string | null } }
  | { type: "setSnapshot"; payload: RunSnapshot | null }
  | { type: "setStreaming"; payload: boolean }
  | { type: "reset" };

const initialState: RunSessionState = {
  report: null,
  runId: null,
  snapshot: null,
  isStreaming: false,
  lastEventAt: null,
};

const runSessionReducer = (state: RunSessionState, action: RunSessionAction): RunSessionState => {
  switch (action.type) {
    case "setReport":
      return {
        ...state,
        report: action.payload,
      };
    case "setRun":
      return {
        ...state,
        runId: action.payload.runId,
        snapshot: action.payload.runId === null ? null : state.snapshot,
      };
    case "setSnapshot":
      return {
        ...state,
        snapshot: action.payload,
        lastEventAt: action.payload?.updatedAt ?? state.lastEventAt,
      };
    case "setStreaming":
      return {
        ...state,
        isStreaming: action.payload,
      };
    case "reset":
      return initialState;
    default:
      return state;
  }
};

interface RunSessionContextValue {
  state: RunSessionState;
  setReport: (report: SessionReport | null) => void;
  setRunId: (runId: string | null) => void;
  setSnapshot: (snapshot: RunSnapshot | null) => void;
  setStreaming: (value: boolean) => void;
  reset: () => void;
}

const RunSessionContext = createContext<RunSessionContextValue | undefined>(undefined);

export const RunSessionProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(runSessionReducer, initialState);

  const setReport = useCallback((report: SessionReport | null) => {
    dispatch({ type: "setReport", payload: report });
  }, []);
  const setRunId = useCallback(
    (runId: string | null) => dispatch({ type: "setRun", payload: { runId } }),
    [],
  );
  const setSnapshot = useCallback(
    (snapshot: RunSnapshot | null) => dispatch({ type: "setSnapshot", payload: snapshot }),
    [],
  );
  const setStreaming = useCallback(
    (value: boolean) => dispatch({ type: "setStreaming", payload: value }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  const value = useMemo<RunSessionContextValue>(
    () => ({
      state,
      setReport,
      setRunId,
      setSnapshot,
      setStreaming,
      reset,
    }),
    [reset, setReport, setRunId, setSnapshot, setStreaming, state],
  );

  return <RunSessionContext.Provider value={value}>{children}</RunSessionContext.Provider>;
};

export const useRunSession = () => {
  const context = useContext(RunSessionContext);

  if (!context) {
    throw new Error("useRunSession must be used within RunSessionProvider");
  }

  return context;
};

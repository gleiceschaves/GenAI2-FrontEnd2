"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";
import type { RunSnapshot } from "@/lib/api/types";

interface UseRunStreamOptions {
  enabled?: boolean;
  onMessage?: (snapshot: RunSnapshot) => void;
  onError?: (error: Event) => void;
}

export function useRunStream(runId: string | null, options: UseRunStreamOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { enabled = true, onMessage, onError } = options;

  useEffect(() => {
    if (!runId || !enabled) {
      return undefined;
    }

    const source = new EventSource(`${API_BASE_URL}/runs/${runId}/stream`, {
      withCredentials: false,
    });
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const snapshot = JSON.parse(event.data) as RunSnapshot;
        onMessage?.(snapshot);
      } catch (error) {
        console.error("Failed to parse SSE payload", error);
      }
    };

    source.onerror = (errorEvent) => {
      onError?.(errorEvent);
      source.close();
    };

    return () => {
      source.close();
      eventSourceRef.current = null;
    };
  }, [enabled, onError, onMessage, runId]);

  return {
    close: () => eventSourceRef.current?.close(),
  };
}

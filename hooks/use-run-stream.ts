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
  
  // Use refs to avoid recreating EventSource when callbacks change
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  }, [onMessage, onError]);

  useEffect(() => {
    if (!runId || !enabled) {
      return undefined;
    }

    console.log(`[SSE] Opening stream for run ${runId}`);
    const source = new EventSource(`${API_BASE_URL}/runs/${runId}/stream`, {
      withCredentials: false,
    });
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const snapshot = JSON.parse(event.data) as RunSnapshot;
        console.log(`[SSE] Received update:`, { status: snapshot.status, progress: snapshot.progress });
        onMessageRef.current?.(snapshot);
      } catch (error) {
        console.error("[SSE] Failed to parse SSE payload", error);
      }
    };

    source.onerror = (errorEvent) => {
      console.error("[SSE] Connection error", errorEvent);
      onErrorRef.current?.(errorEvent);
      source.close();
    };
    
    source.onopen = () => {
      console.log(`[SSE] Connection opened for run ${runId}`);
    };

    return () => {
      console.log(`[SSE] Closing stream for run ${runId}`);
      source.close();
      eventSourceRef.current = null;
    };
  }, [enabled, runId]);

  return {
    close: () => eventSourceRef.current?.close(),
  };
}

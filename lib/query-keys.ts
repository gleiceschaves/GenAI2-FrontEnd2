export const queryKeys = {
  reports: (filters?: { q?: string }) => ["reports", filters?.q ?? ""] as const,
  report: (reportId: string | number) => ["reports", reportId] as const,
  reportSignature: (reportId: string | number) => ["reports", reportId, "signature"] as const,
  runs: (reportId: string | number) => ["reports", reportId, "runs"] as const,
  run: (runId: string) => ["runs", runId] as const,
  runOutput: (runId: string) => ["runs", runId, "output"] as const,
};

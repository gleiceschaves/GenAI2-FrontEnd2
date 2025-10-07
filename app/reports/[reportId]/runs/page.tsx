"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCcw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRunSession } from "@/context/run-session-context";
import { getReport, getReportSignature } from "@/lib/api/reports";
import { createRunForReport, fetchRunsForReport } from "@/lib/api/runs";
import type { ReportSignature, Run } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";
import { extractErrorMessage } from "@/lib/api/client";

export default function ReportRunsPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setReport, setRunId, setSnapshot } = useRunSession();

  const [signatureError, setSignatureError] = useState<string | null>(null);

  const reportQuery = useQuery({
    queryKey: queryKeys.report(reportId),
    queryFn: () => getReport(reportId),
    staleTime: 10_000,
  });

  const runsQuery = useQuery({
    queryKey: queryKeys.runs(reportId),
    queryFn: () => fetchRunsForReport(reportId),
    enabled: reportQuery.isSuccess,
  });

  const signatureQuery = useQuery({
    queryKey: queryKeys.reportSignature(reportId),
    queryFn: () => getReportSignature(reportId),
    enabled: reportQuery.isSuccess,
    retry: false,
  });

  useEffect(() => {
    if (reportQuery.data) {
      setReport(reportQuery.data);
    }
  }, [reportQuery.data, setReport]);

  useEffect(() => {
    if (signatureQuery.error) {
      const message =
        signatureQuery.error instanceof Error
          ? signatureQuery.error.message
          : "Unable to load current signature.";
      setSignatureError(message);
    } else {
      setSignatureError(null);
    }
  }, [signatureQuery.error]);

  const createRunMutation = useMutation({
    mutationFn: () => createRunForReport(reportId, { context: "" }),
    onSuccess: async (run) => {
      toast.success("Run created. Opening workspace.");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.runs(reportId),
      });
      setRunId(run.id);
      setSnapshot(null);
      router.push(`/reports/${reportId}/runs/${run.id}`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const runs = useMemo<Run[]>(() => runsQuery.data ?? [], [runsQuery.data]);
  const signature = (signatureQuery.data ?? null) as ReportSignature | null;
  const report = reportQuery.data;
  const isLoading = reportQuery.isLoading || runsQuery.isLoading;
  const hasError = reportQuery.isError;

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 pb-12 lg:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Report #{reportId}
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            {report?.name ?? "Report"}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review previous runs, inspect the latest signature, or start a new processing session.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.runs(reportId) });
              queryClient.invalidateQueries({
                queryKey: queryKeys.reportSignature(reportId),
              });
            }}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => createRunMutation.mutate()} disabled={createRunMutation.isPending}>
            {createRunMutation.isPending ? (
              <>
                <Spinner size={16} />
                Starting...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create run
              </>
            )}
          </Button>
        </div>
      </header>

      {hasError ? (
        <Alert
          variant="error"
          title="Unable to load report"
          description={
            reportQuery.error instanceof Error
              ? reportQuery.error.message
              : "Please refresh and try again."
          }
        />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold">Runs</h2>
            <Badge variant="secondary">
              {runs.length} {runs.length === 1 ? "run" : "runs"}
            </Badge>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Run
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 md:table-cell">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12">
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Spinner />
                        <span className="text-sm">Loading runs...</span>
                      </div>
                    </td>
                  </tr>
                ) : runs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                        <span className="text-sm">
                          No runs found. Create one to begin processing documents.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => {
                        setRunId(run.id);
                        setSnapshot(null);
                        router.push(`/reports/${reportId}/runs/${run.id}`);
                      }}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex flex-col gap-1">
                          <span>{run.id}</span>
                          {run.signatureVersion ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Signature v{run.signatureVersion}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="hidden px-4 py-4 text-sm text-slate-600 dark:text-slate-300 md:table-cell">
                        {typeof run.progress === "number" ? `${Math.round(run.progress)}%` : "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(run.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold">Signature</h2>
            <Badge variant="secondary">
              {report?.latestSignatureVersion
                ? `v${report.latestSignatureVersion}`
                : "Not published"}
            </Badge>
          </div>
          <div className="flex h-full flex-col gap-3 overflow-hidden px-6 py-4 text-sm">
            {signatureQuery.isLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
                <Spinner />
                <span>Loading signature...</span>
              </div>
            ) : signature ? (
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <FileText className="h-4 w-4" />
                  Updated {formatDate(signature.updatedAt)}
                </div>
                <pre className="max-h-[420px] overflow-auto rounded-md bg-slate-950/90 p-4 text-xs text-slate-100">
                  {JSON.stringify(signature.signature, null, 2)}
                </pre>
              </div>
            ) : (
              <Alert
                variant={signatureError ? "warning" : "info"}
                title={signatureError ? "Signature unavailable" : "No signature published"}
                description={
                  signatureError ?? "Create or publish a signature to make it visible here."
                }
              />
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: Run["status"] }) {
  switch (status) {
    case "done":
      return <Badge variant="success">Done</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "running":
    case "structuring":
      return <Badge variant="secondary">Processing</Badge>;
    case "uploading":
      return <Badge variant="secondary">Uploading</Badge>;
    case "pending":
    case "created":
      return <Badge variant="ghost">Pending</Badge>;
    default:
      return <Badge variant="ghost">{status}</Badge>;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

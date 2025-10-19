"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BackButton } from "@/components/back-button";
import { useRunSession } from "@/context/run-session-context";
import { extractErrorMessage } from "@/lib/api/client";
import { createReport, fetchReports } from "@/lib/api/reports";
import { createRunForReport } from "@/lib/api/runs";
import type { Report } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface CreateReportFormState {
  name: string;
  error: string | null;
}

export default function ReportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setReport, setRunId, setSnapshot } = useRunSession();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 400);

  const reportsQuery = useQuery({
    queryKey: queryKeys.reports({ q: debouncedSearch }),
    queryFn: () => fetchReports(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : undefined),
    staleTime: 5_000,
  });

  const createReportMutation = useMutation({
    mutationFn: async (reportName: string) => {
      const report = await createReport({ name: reportName });
      const run = await createRunForReport(report.id, { context: "" });
      return { report, run };
    },
    onSuccess: async ({ report }) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reports({ q: "" }),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reports({ q: debouncedSearch }),
      });
      setReport(report);
    },
  });

  const reports = useMemo<Report[]>(() => reportsQuery.data ?? [], [reportsQuery.data]);

  const handleCreateReport = async (name: string) => {
    try {
      const { report, run } = await createReportMutation.mutateAsync(name);
      toast.success(`Report "${report.name}" created. Opening a new run.`);
      setRunId(run.id);
      setSnapshot(null);
      router.push(`/reports/${report.id}/runs/${run.id}`);
      setIsCreateOpen(false);
    } catch (error) {
      const message = extractErrorMessage(error);
      toast.error(message);
      throw error;
    }
  };

  const handleSelectReport = (report: Report) => {
    setReport(report);
    setRunId(null);
    setSnapshot(null);
    router.push(`/reports/${report.id}/runs`);
  };

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 pb-12 lg:p-8">
      <BackButton fallbackHref="/" className="self-start" />
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Browse existing reports, inspect their signatures, or create a new workspace.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create report
        </Button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Search reports"
              className="pl-9"
              placeholder="Search reports..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Badge variant="secondary">
            {reports.length} {reports.length === 1 ? "report" : "reports"}
          </Badge>
        </div>

        {reportsQuery.isError ? (
          <Alert
            className="mt-4"
            variant="error"
            title="Unable to load reports"
            description={(reportsQuery.error as Error)?.message ?? "Please refresh and try again."}
          />
        ) : null}

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/70">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Name
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 md:table-cell">
                  Latest signature
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:table-cell">
                  Runs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {reportsQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                      <Spinner />
                      <span className="text-sm">Loading reports...</span>
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <span className="text-sm">
                        No reports yet. Create your first one to get started.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => handleSelectReport(report)}
                    className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex flex-col gap-1">
                        <span>{report.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          #{report.id}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 text-sm text-slate-600 dark:text-slate-300 md:table-cell">
                      {report.latestSignatureVersion != null ? (
                        <Badge variant="secondary">v{report.latestSignatureVersion}</Badge>
                      ) : (
                        <span className="text-xs uppercase tracking-wide text-slate-400">
                          Not published
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-4 text-sm text-slate-600 dark:text-slate-300 sm:table-cell">
                      {report.runsCount}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {formatDate(report.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreateReportModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateReport}
        isLoading={createReportMutation.isPending}
        error={createReportMutation.error}
      />
    </main>
  );
}

function CreateReportModal({
  open,
  onClose,
  onSubmit,
  isLoading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  isLoading: boolean;
  error: unknown;
}) {
  const [formState, setFormState] = useState<CreateReportFormState>({
    name: "",
    error: null,
  });

  const resolvedError = formState.error ?? (error instanceof Error ? error.message : null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = formState.name.trim();
    if (!trimmed) {
      setFormState((prev) => ({
        ...prev,
        error: "Provide a report name to continue.",
      }));
      return;
    }

    try {
      await onSubmit(trimmed);
      setFormState({ name: "", error: null });
    } catch (err) {
      setFormState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Unable to create report.",
      }));
    }
  };

  const handleClose = () => {
    setFormState({ name: "", error: null });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create a report"
      description="Name your report and we will spin up a fresh run."
      size="sm"
      footer={null}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Report name
          </span>
          <Input
            autoFocus
            placeholder="CBC Panel"
            value={formState.name}
            onChange={(event) => setFormState({ name: event.target.value, error: null })}
          />
        </label>
        {resolvedError ? (
          <Alert variant="error" title="Something went wrong" description={resolvedError} />
        ) : null}
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size={16} />
                Creating...
              </>
            ) : (
              "Create and open chat"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
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

"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Upload, Play, Paperclip, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { CopilotChat } from "@copilotkit/react-ui";
import { 
  useCopilotAdditionalInstructions, 
  useCopilotChat
} from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BackButton } from "@/components/back-button";
import { useRunSession } from "@/context/run-session-context";
import { useRunStream } from "@/hooks/use-run-stream";
import { queryKeys } from "@/lib/query-keys";
import { fetchRunOutput, getRun, startRun, uploadRunDocuments } from "@/lib/api/runs";
import { getReportSignature } from "@/lib/api/reports";
import type { ReportSignature, RunDocument, RunSnapshot } from "@/lib/api/types";
import { extractErrorMessage } from "@/lib/api/client";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/json",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export default function RunWorkspacePage() {
  const { reportId, runId } = useParams<{
    reportId: string;
    runId: string;
  }>();
  const queryClient = useQueryClient();
  const { state: sessionState, setReport, setRunId, setSnapshot, setStreaming } = useRunSession();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamErrorEmittedRef = useRef(false);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { reset } = useCopilotChat({ id: `run-${runId}` });

  const runQuery = useQuery({
    queryKey: queryKeys.run(runId),
    queryFn: () => getRun(runId),
    enabled: Boolean(runId),
    refetchInterval: sessionState.isStreaming ? false : 30_000,
  });

  const signatureQuery = useQuery({
    queryKey: queryKeys.reportSignature(reportId),
    queryFn: () => getReportSignature(reportId),
    enabled: Boolean(reportId),
    retry: false,
  });

  const startRunMutation = useMutation({
    mutationFn: () => startRun(runId),
    onMutate: () => {
      setStreamError(null);
      setStreaming(true);
    },
    onSuccess: () => {
      toast.success("Run started. Listening for live updates.");
      queryClient.invalidateQueries({ queryKey: queryKeys.run(runId) }).catch(() => undefined);
    },
    onError: (error) => {
      const message = extractErrorMessage(error);
      setStreamError(message);
      setStreaming(false);
      toast.error(message);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadRunDocuments(runId, files),
    onSuccess: ({ docIds }) => {
      toast.success(
        docIds.length === 1 ? "Uploaded 1 document." : `Uploaded ${docIds.length} documents.`,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.run(runId) }).catch(() => undefined);
      setUploadError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      const message = extractErrorMessage(error);
      setUploadError(message);
      toast.error(message);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: () => fetchRunOutput(runId),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${runId}-output.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Output JSON downloaded.");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const snapshot = sessionState.snapshot ?? runQuery.data ?? null;
  const docs = useMemo(() => snapshot?.docs ?? [], [snapshot?.docs]);
  const report = snapshot?.report ?? null;
  const signature = (signatureQuery.data ?? null) as ReportSignature | null;

  const streamingEnabled = snapshot != null && !["done", "error"].includes(snapshot.status);

  const reportLabel = report?.name ?? `Report ${reportId}`;

  // Real-time updates via SSE - memoize callbacks to prevent reconnections
  const handleStreamMessage = useCallback((streamSnapshot: RunSnapshot) => {
    setStreamError(null);
    streamErrorEmittedRef.current = false;
    setSnapshot(streamSnapshot);
    setReport(streamSnapshot.report);
    setRunId(streamSnapshot.runId);
    // Update query cache without triggering refetch
    queryClient.setQueryData(queryKeys.run(streamSnapshot.runId), streamSnapshot);
  }, [queryClient, setReport, setRunId, setSnapshot]);

  const handleStreamError = useCallback(() => {
    const message = "Live updates interrupted. Falling back to polling.";
    setStreamError(message);
    setStreaming(false);
    if (!streamErrorEmittedRef.current) {
      toast.warning(message);
      streamErrorEmittedRef.current = true;
    }
  }, [setStreaming]);

  useRunStream(runId ?? null, {
    enabled: streamingEnabled,
    onMessage: handleStreamMessage,
    onError: handleStreamError,
  });

  useEffect(() => {
    if (runQuery.data) {
      setReport(runQuery.data.report);
      setRunId(runQuery.data.runId);
      setSnapshot(runQuery.data);
    }
  }, [runQuery.data, setReport, setRunId, setSnapshot]);

  useEffect(() => {
    if (snapshot) {
      setSelectedDocId((prev) => {
        if (prev && snapshot.docs.some((doc) => doc.id === prev)) {
          return prev;
        }
        return snapshot.docs.length > 0 ? (snapshot.docs[0]?.id ?? null) : null;
      });
    }
  }, [snapshot]);

  useEffect(() => {
    reset();
  }, [reset, runId]);

  useCopilotAdditionalInstructions({
    instructions: report
      ? `You are the agent assisting with report "${report.name}" (ID ${report.id}). The active run ID is ${runId}. Provide focused, structured answers and cite extracted documents when relevant.`
      : "You are assisting with an ongoing report run.",
    available: report ? "enabled" : "disabled",
  });

  const selectedDoc = useMemo(() => {
    if (!selectedDocId) {
      return null;
    }
    return docs.find((doc) => doc.id === selectedDocId) ?? null;
  }, [docs, selectedDocId]);

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    const files = Array.from(fileList);
    const oversized = files.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      const names = oversized.map((file) => file.name).join(", ");
      const message = `File size must be under 25MB. Problem files: ${names}`;
      toast.error(message);
      setUploadError(message);
      return;
    }

    const disallowed = files.filter(
      (file) =>
        ACCEPTED_FILE_TYPES.length > 0 &&
        !ACCEPTED_FILE_TYPES.some((type) => {
          if (type === "image/*") {
            return file.type.startsWith("image/");
          }
          return file.type === type;
        }),
    );

    if (disallowed.length > 0) {
      const names = disallowed.map((file) => file.name).join(", ");
      const message = `Unsupported file type. Remove: ${names}`;
      toast.error(message);
      setUploadError(message);
      return;
    }

    await uploadMutation.mutateAsync(files);
  };

  const canStartRun =
    docs.length > 0 &&
    snapshot != null &&
    !["running", "structuring", "done"].includes(snapshot.status);

  // Allow download if status is "done" OR if there's output despite error status
  const canDownload = snapshot != null && (
    snapshot.status === "done" || 
    (snapshot.status === "error" && snapshot.outputJson != null)
  );

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 pb-12 lg:p-8">
      <div className="flex flex-col gap-2 self-start">
        <BackButton
          fallbackHref={`/reports/${reportId}/runs`}
          label="Back to runs"
          className="self-start"
        />
        <Breadcrumbs
          items={[
            { label: "Reports", href: "/reports" },
            { label: reportLabel, href: `/reports/${reportId}/runs` },
            { label: `Run ${runId}` },
          ]}
        />
      </div>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Report #{reportId} · Run {runId}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {report?.name ?? "Run workspace"}
            </h1>
            {snapshot ? <RunStatusBadge snapshot={snapshot} /> : null}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload documents, monitor structuring progress, and collaborate with the copilot.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => downloadMutation.mutate()}
            disabled={!canDownload || downloadMutation.isPending}
          >
            {downloadMutation.isPending ? (
              <>
                <Spinner size={16} />
                Preparing JSON...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download JSON
              </>
            )}
          </Button>
          <Button
            onClick={() => startRunMutation.mutate()}
            disabled={!canStartRun || startRunMutation.isPending}
          >
            {startRunMutation.isPending ? (
              <>
                <Spinner size={16} />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start processing
              </>
            )}
          </Button>
        </div>
      </header>

      {streamError ? (
        <Alert
          variant="warning"
          title="Live updates paused"
          description={streamError}
          className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
        />
      ) : null}

      <section className="grid min-h-[420px] grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <LeftPreviewPanel
          signature={signature}
          reportName={report?.name ?? ""}
          selectedDoc={selectedDoc}
          hasDocs={docs.length > 0}
          isLoadingSignature={signatureQuery.isLoading}
          signatureError={
            signatureQuery.error instanceof Error ? signatureQuery.error.message : null
          }
        />
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CopilotChat
            className="h-full"
            instructions={
              report
                ? `You are assisting with report "${report.name}" (ID ${report.id}) run ${runId}. Provide structured, concise responses.`
                : "You are assisting with an ongoing report run."
            }
            labels={{
              title: report ? `${report.name} assistant` : "Run assistant",
              placeholder: "Ask the copilot how the run is progressing...",
            }}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <DocumentsSection
          documents={docs}
          selectedDocId={selectedDocId}
          onSelect={setSelectedDocId}
          onBrowseClick={() => fileInputRef.current?.click()}
          onFileChange={handleFileSelection}
          fileInputRef={fileInputRef}
          isUploading={uploadMutation.isPending}
          uploadError={uploadError}
        />
        <RunInsightsPanel snapshot={snapshot} />
      </section>
    </main>
  );
}

function LeftPreviewPanel({
  signature,
  reportName,
  selectedDoc,
  hasDocs,
  isLoadingSignature,
  signatureError,
}: {
  signature: ReportSignature | null;
  reportName: string;
  selectedDoc: RunDocument | null;
  hasDocs: boolean;
  isLoadingSignature: boolean;
  signatureError: string | null;
}) {
  const showingDocument = Boolean(selectedDoc);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {showingDocument ? selectedDoc?.name : "Report signature"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {showingDocument
              ? "Document details and extraction progress."
              : `Latest structure for ${reportName}.`}
          </p>
        </div>
        <Badge variant="secondary">
          {showingDocument ? "Preview" : signature?.version ? `v${signature.version}` : "Draft"}
        </Badge>
      </div>

      <div className="relative flex-1 overflow-auto rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
        {showingDocument ? (
          <DocumentPreview doc={selectedDoc!} />
        ) : isLoadingSignature ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-slate-500">
            <Spinner />
            <span>Loading signature...</span>
          </div>
        ) : signature ? (
          <pre className="max-h-[420px] whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(signature.signature, null, 2)}
          </pre>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-slate-500">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">
              {hasDocs
                ? "No signature published yet. The agent will use AI extraction."
                : (signatureError ?? "Upload documents to begin capturing signature data.")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentPreview({ doc }: { doc: RunDocument }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
        <Paperclip className="h-4 w-4" />
        {doc.name}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <dt className="font-medium uppercase tracking-wide opacity-70">Document ID</dt>
          <dd className="truncate">{doc.id}</dd>
        </div>
        {doc.size ? (
          <div>
            <dt className="font-medium uppercase tracking-wide opacity-70">Size</dt>
            <dd>{formatBytes(doc.size)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-medium uppercase tracking-wide opacity-70">OCR</dt>
          <dd>{doc.ocrDone ? "Completed" : "Pending"}</dd>
        </div>
        {doc.validated != null ? (
          <div>
            <dt className="font-medium uppercase tracking-wide opacity-70">Validated</dt>
            <dd>{doc.validated ? "Yes" : "No"}</dd>
          </div>
        ) : null}
        <div className="col-span-2">
          <dt className="font-medium uppercase tracking-wide opacity-70">Uploaded</dt>
          <dd>{formatDate(doc.uploadedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function DocumentsSection({
  documents,
  selectedDocId,
  onSelect,
  onBrowseClick,
  onFileChange,
  fileInputRef,
  isUploading,
  uploadError,
}: {
  documents: RunDocument[];
  selectedDocId: string | null;
  onSelect: (id: string) => void;
  onBrowseClick: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isUploading: boolean;
  uploadError: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Documents</h2>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple onChange={onFileChange} hidden />
          <Button variant="outline" onClick={onBrowseClick} disabled={isUploading}>
            {isUploading ? (
              <>
                <Spinner size={16} />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload documents
              </>
            )}
          </Button>
          <Badge variant="secondary">{documents.length}</Badge>
        </div>
      </div>
      {uploadError ? (
        <Alert variant="error" title="Upload failed" description={uploadError} />
      ) : null}
      {documents.length === 0 ? (
        <div className="flex flex-1 min-h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          No documents uploaded yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  className={`flex w-full flex-col gap-1 rounded-lg border px-4 py-3 text-left text-sm transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900/5 dark:border-slate-200 dark:bg-slate-200/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  }`}
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{doc.name}</span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatDate(doc.uploadedAt)}</span>
                    <span>•</span>
                    <span>{doc.ocrDone ? "OCR done" : "OCR pending"}</span>
                    {doc.validated != null ? (
                      <>
                        <span>•</span>
                        <span>{doc.validated ? "Validated" : "Needs validation"}</span>
                      </>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RunInsightsPanel({ snapshot }: { snapshot: RunSnapshot | null }) {
  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Spinner />
        <span className="text-sm">Loading run details…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Run details</h2>
      <dl className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <dt className="font-medium text-slate-500 dark:text-slate-400">Status</dt>
          <RunStatusBadge snapshot={snapshot} />
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-medium text-slate-500 dark:text-slate-400">Progress</dt>
          <dd>{snapshot.progress != null ? `${Math.round(snapshot.progress)}%` : "—"}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-medium text-slate-500 dark:text-slate-400">Documents processed</dt>
          <dd>
            {snapshot.docs.filter((doc) => doc.ocrDone).length}/{snapshot.docs.length}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-medium text-slate-500 dark:text-slate-400">Conflicts</dt>
          <dd>{snapshot.conflicts.length}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-medium text-slate-500 dark:text-slate-400">Added fields</dt>
          <dd>{snapshot.addedFields.length}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500 dark:text-slate-400">Last updated</dt>
          <dd>{formatDate(snapshot.updatedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function RunStatusBadge({ snapshot }: { snapshot: RunSnapshot }) {
  switch (snapshot.status) {
    case "done":
      return <Badge variant="success">Completed</Badge>;
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
      return <Badge variant="ghost">{snapshot.status}</Badge>;
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

function formatBytes(bytes?: number) {
  if (!bytes || Number.isNaN(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(1)} ${units[exponent]}`;
}

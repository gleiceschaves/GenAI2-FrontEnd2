export type RunNodeName = "ingest_docs" | "ocr_extract" | "validate" | "finalize" | "error";

export type RunStatus = "created" | "pending" | "running" | "structuring" | "done" | "error";

export interface Report {
  id: number;
  name: string;
  latestSignatureVersion: number | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSignature {
  reportId: number;
  version: number;
  status: "proposed" | "current" | "archived";
  schema: unknown;
  updatedAt: string;
}

export interface Run {
  id: string;
  reportId: number;
  status: RunStatus;
  progress: number;
  context: string | null;
  signatureVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RunDocument {
  id: string;
  name: string;
  contentType?: string;
  size?: number;
  ocrDone: boolean;
  validated?: boolean;
  uploadedAt: string;
}

export interface ValidationConflict {
  field: string;
  message: string;
  suggestedValue?: unknown;
}

export interface RunSnapshot {
  report: Pick<Report, "id" | "name" | "latestSignatureVersion">;
  runId: string;
  status: RunStatus;
  progress: number;
  docs: RunDocument[];
  context: string | null;
  outputJson: Record<string, unknown> | null;
  signatureVersion: number | null;
  addedFields: string[];
  conflicts: ValidationConflict[];
  validationReport: Record<string, unknown> | null;
  error: string | null;
  updatedAt: string;
  node?: RunNodeName;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface CreateReportPayload {
  name: string;
}

export interface CreateRunPayload {
  context?: string;
}

export interface UploadDocumentsResponse {
  docIds: string[];
}

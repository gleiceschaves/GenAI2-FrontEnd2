import { request } from "@/lib/api/client";
import {
  type CreateRunPayload,
  type Run,
  type RunSnapshot,
  type RunStatus,
  type UploadDocumentsResponse,
} from "@/lib/api/types";

interface RunCreationResponse {
  runId: string;
  status?: RunStatus | null;
  signatureVersion?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

const normalizeRunCreation = (response: RunCreationResponse, reportId?: string | number) => {
  const numericReportId =
    reportId !== undefined && typeof reportId === "string"
      ? Number.parseInt(reportId, 10)
      : reportId;
  return {
    id: response.runId,
    reportId: typeof numericReportId === "number" ? numericReportId : undefined,
    status: response.status ?? "created",
    progress: null,
    context: null,
    signatureVersion: response.signatureVersion ?? null,
    createdAt: response.createdAt ?? new Date().toISOString(),
    updatedAt: response.updatedAt ?? response.createdAt ?? new Date().toISOString(),
  } satisfies Run;
};

export const createRunForReport = async (reportId: string | number, payload: CreateRunPayload) => {
  const response = await request<RunCreationResponse>({
    method: "POST",
    url: `/reports/${reportId}/runs`,
    data: payload,
  });

  return normalizeRunCreation(response, reportId);
};

export const createRunByReportName = async (reportName: string, payload: CreateRunPayload) => {
  const response = await request<RunCreationResponse>({
    method: "POST",
    url: "/runs",
    data: {
      reportName,
      ...payload,
    },
  });

  return normalizeRunCreation(response);
};

interface RunListItem {
  runId: string;
  status?: RunStatus | null;
  signatureVersion?: number | null;
  createdAt: string;
  updatedAt: string;
  progress?: number | null;
}

interface PaginatedRunsResponse {
  items: RunListItem[];
  total: number;
  page: number;
  limit: number;
}

export const fetchRunsForReport = async (reportId: string | number) => {
  const response = await request<PaginatedRunsResponse>({
    method: "GET",
    url: `/reports/${reportId}/runs`,
  });

  return response.items.map((item) => {
    const numericReportId = typeof reportId === "string" ? Number.parseInt(reportId, 10) : reportId;
    return {
      id: item.runId,
      reportId: Number.isFinite(numericReportId) ? (numericReportId as number) : undefined,
      status: item.status ?? "pending",
      progress: item.progress ?? null,
      context: null,
      signatureVersion: item.signatureVersion ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    } satisfies Run;
  });
};

export const getRun = (runId: string) => {
  return request<RunSnapshot>({
    method: "GET",
    url: `/runs/${runId}`,
  });
};

export const startRun = (runId: string) => {
  return request<{ started: boolean }>({
    method: "POST",
    url: `/runs/${runId}/start`,
  });
};

export const uploadRunDocuments = async (runId: string, files: File[]) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  return request<UploadDocumentsResponse>({
    method: "POST",
    url: `/runs/${runId}/upload`,
    headers: {
      "Content-Type": "multipart/form-data",
    },
    data: formData,
  });
};

export const fetchRunOutput = (runId: string) => {
  return request<Record<string, unknown>>({
    method: "GET",
    url: `/outputs/${runId}`,
  });
};

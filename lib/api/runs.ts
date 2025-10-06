import { request } from "@/lib/api/client";
import {
  type CreateRunPayload,
  type Run,
  type RunSnapshot,
  type UploadDocumentsResponse,
} from "@/lib/api/types";

export const createRunForReport = (reportId: string | number, payload: CreateRunPayload) => {
  return request<Run>({
    method: "POST",
    url: `/reports/${reportId}/runs`,
    data: payload,
  });
};

export const createRunByReportName = (reportName: string, payload: CreateRunPayload) => {
  return request<Run>({
    method: "POST",
    url: "/runs",
    data: {
      reportName,
      ...payload,
    },
  });
};

export const fetchRunsForReport = (reportId: string | number) => {
  return request<Run[]>({
    method: "GET",
    url: `/reports/${reportId}/runs`,
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

import { request } from "@/lib/api/client";
import { type CreateReportPayload, type Report, type ReportSignature } from "@/lib/api/types";

export const fetchReports = (params?: { q?: string; page?: number; pageSize?: number }) => {
  return request<Report[]>({
    method: "GET",
    url: "/reports",
    params,
  });
};

export const createReport = (payload: CreateReportPayload) => {
  return request<Report>({
    method: "POST",
    url: "/reports",
    data: payload,
  });
};

export const getReport = (reportId: string | number) => {
  return request<Report>({
    method: "GET",
    url: `/reports/${reportId}`,
  });
};

export const getReportSignature = (reportId: string | number) => {
  return request<ReportSignature>({
    method: "GET",
    url: `/reports/${reportId}/signature`,
  });
};

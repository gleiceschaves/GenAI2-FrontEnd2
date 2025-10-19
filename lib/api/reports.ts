import { request } from "@/lib/api/client";
import { type CreateReportPayload, type Report, type ReportSignature } from "@/lib/api/types";

interface PaginatedReports {
  items: Report[];
  total: number;
  page: number;
  limit: number;
}

console.log("API_BASE_URL:", process.env.API_BASE_URL);
export const fetchReports = async (params?: { q?: string; page?: number; pageSize?: number }) => {
  const response = await request<PaginatedReports>({
    method: "GET",
    url: "/reports",
    params,
  });

  if (typeof window !== "undefined") {
    console.info("[api][reports] fetched", {
      query: params,
      count: response.items.length,
    });
  }

  return response.items;
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

export const deleteReport = (reportId: string | number) => {
  return request<void>({
    method: "DELETE",
    url: `/reports/${reportId}`,
  });
};

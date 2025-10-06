import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/config";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 30_000,
});

export type ApiError = AxiosError<{
  message?: string;
  detail?: string;
  error?: string;
}>;

export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    return data?.message ?? data?.detail ?? data?.error ?? error.message ?? "Request failed";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
};

export const withBaseUrl = (path: string) => `${API_BASE_URL}${path}`;

export const request = <T>(config: AxiosRequestConfig) =>
  apiClient.request<T>(config).then((res) => res.data);

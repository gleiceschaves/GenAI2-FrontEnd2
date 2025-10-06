import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/config";

if (typeof window !== "undefined") {
  console.info("[api] configured base URL:", API_BASE_URL);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const method = (config.method ?? "GET").toUpperCase();
    const fullUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
    console.info("[api][request]", method, fullUrl, {
      params: config.params,
      data: config.data,
    });
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined") {
      const method = (response.config.method ?? "GET").toUpperCase();
      const fullUrl = `${response.config.baseURL ?? ""}${response.config.url ?? ""}`;
      console.info("[api][response]", method, fullUrl, {
        status: response.status,
      });
    }
    return response;
  },
  (error) => {
    if (typeof window !== "undefined") {
      if (error.config) {
        const method = (error.config.method ?? "GET").toUpperCase();
        const fullUrl = `${error.config.baseURL ?? ""}${error.config.url ?? ""}`;
        console.error("[api][response-error]", method, fullUrl, {
          status: error.response?.status,
          message: error.message,
        });
      } else {
        console.error("[api][response-error]", error);
      }
    }
    return Promise.reject(error);
  },
);

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

export const request = <T>(config: AxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    console.info("[api][dispatch]", {
      method: config.method ?? "GET",
      baseURL: config.baseURL ?? API_BASE_URL,
      url: config.url,
    });
  }
  return apiClient.request<T>(config).then((res) => res.data);
};

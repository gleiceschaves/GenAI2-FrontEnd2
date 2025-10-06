const DEFAULT_API_BASE_URL = "http://localhost:8000";
const DEFAULT_COPILOT_AGENT_PATH = "/copilot";
const DEFAULT_COPILOT_AGENT_NAME = "reports-agent";

const getEnv = (key: string) => (typeof process !== "undefined" ? process.env?.[key] : undefined);

const normalizePath = (path: string) => {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
};

export const API_BASE_URL =
  getEnv("NEXT_PUBLIC_API_BASE_URL") ?? getEnv("API_BASE_URL") ?? DEFAULT_API_BASE_URL;

export const COPILOT_AGENT_PATH = normalizePath(
  getEnv("NEXT_PUBLIC_COPILOT_AGENT_PATH") ??
    getEnv("COPILOT_AGENT_PATH") ??
    DEFAULT_COPILOT_AGENT_PATH,
);

export const COPILOT_AGENT_NAME =
  getEnv("NEXT_PUBLIC_COPILOT_AGENT_NAME") ??
  getEnv("COPILOT_AGENT_NAME") ??
  DEFAULT_COPILOT_AGENT_NAME;

export const COPILOT_RUNTIME_URL = `${API_BASE_URL}${COPILOT_AGENT_PATH}`;

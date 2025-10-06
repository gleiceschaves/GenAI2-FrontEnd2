const DEFAULT_API_BASE_URL = "http://localhost:8000";
const DEFAULT_COPILOT_AGENT_PATH = "/copilot";
const DEFAULT_COPILOT_AGENT_NAME = "reports-agent";

const normalizePath = (path: string) => {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
};

const publicBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const serverBaseUrl = process.env.API_BASE_URL;
const publicAgentPath = process.env.NEXT_PUBLIC_COPILOT_AGENT_PATH;
const serverAgentPath = process.env.COPILOT_AGENT_PATH;
const publicAgentName = process.env.NEXT_PUBLIC_COPILOT_AGENT_NAME;
const serverAgentName = process.env.COPILOT_AGENT_NAME;

export const API_BASE_URL = publicBaseUrl ?? serverBaseUrl ?? DEFAULT_API_BASE_URL;
export const COPILOT_AGENT_PATH = normalizePath(
  publicAgentPath ?? serverAgentPath ?? DEFAULT_COPILOT_AGENT_PATH,
);
export const COPILOT_AGENT_NAME = publicAgentName ?? serverAgentName ?? DEFAULT_COPILOT_AGENT_NAME;

export const COPILOT_RUNTIME_URL = `${API_BASE_URL}${COPILOT_AGENT_PATH}`;

if (typeof window !== "undefined") {
  console.info("[config] API_BASE_URL:", API_BASE_URL);
  console.info("[config] COPILOT_RUNTIME_URL:", COPILOT_RUNTIME_URL);
}

const DEFAULT_API_BASE_URL = "https://keck.gleicechaves.com";

/**
 * Backend base URL. This is intentionally available without NEXT_PUBLIC
 * prefixes because we rely on a single known deployment target. Adjust
 * via API_BASE_URL in env files when needed.
 */
export const API_BASE_URL =
  typeof process !== "undefined" && process.env?.API_BASE_URL
    ? process.env.API_BASE_URL
    : DEFAULT_API_BASE_URL;

export type BoxtalEnvironment = "production" | "sandbox";

export const BOXTAL_BASE_URLS: Readonly<Record<BoxtalEnvironment, string>> = {
  production: "https://api.boxtal.com",
  sandbox: "https://api.boxtal.build",
};

export interface BoxtalClientOptions {
  /** Application access key obtained on the developer app. */
  accessKey: string;
  /** Application secret key obtained on the developer app. */
  secretKey: string;
  /** Selects the Boxtal environment. Defaults to "production". Ignored when `baseUrl` is provided. */
  environment?: BoxtalEnvironment;
  /** Override the base URL (e.g. for a private gateway or test double). */
  baseUrl?: string;
  /**
   * Authentication strategy:
   * - "bearer" (default): exchange Basic credentials for a short-lived Bearer token, cached and refreshed transparently.
   * - "basic": send Basic auth on every request (no token exchange).
   */
  auth?: "bearer" | "basic";
  /** Per-request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /**
   * Retry policy for transient errors (network failures and 5xx responses).
   * Defaults to 2 retries with exponential backoff starting at 200ms.
   */
  retries?: {
    count: number;
    initialBackoffMs?: number;
    maxBackoffMs?: number;
  };
  /** Optional fetch implementation override (defaults to globalThis.fetch). */
  fetch?: typeof globalThis.fetch;
  /** Optional default headers to apply to every request. */
  defaultHeaders?: Record<string, string>;
}

export interface ResolvedConfig {
  accessKey: string;
  secretKey: string;
  baseUrl: string;
  auth: "bearer" | "basic";
  timeoutMs: number;
  retries: { count: number; initialBackoffMs: number; maxBackoffMs: number };
  fetch: typeof globalThis.fetch;
  defaultHeaders: Record<string, string>;
}

export function resolveConfig(options: BoxtalClientOptions): ResolvedConfig {
  if (!options.accessKey) throw new TypeError("BoxtalClient: `accessKey` is required");
  if (!options.secretKey) throw new TypeError("BoxtalClient: `secretKey` is required");

  const env: BoxtalEnvironment = options.environment ?? "production";
  const baseUrl = (options.baseUrl ?? BOXTAL_BASE_URLS[env]).replace(/\/+$/, "");

  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError(
      "BoxtalClient: global fetch is unavailable. Provide `options.fetch` or run on Node >= 18.",
    );
  }

  return {
    accessKey: options.accessKey,
    secretKey: options.secretKey,
    baseUrl,
    auth: options.auth ?? "bearer",
    timeoutMs: options.timeoutMs ?? 30_000,
    retries: {
      count: options.retries?.count ?? 2,
      initialBackoffMs: options.retries?.initialBackoffMs ?? 200,
      maxBackoffMs: options.retries?.maxBackoffMs ?? 2_000,
    },
    fetch: fetchImpl.bind(globalThis),
    defaultHeaders: { ...(options.defaultHeaders ?? {}) },
  };
}

import type { ResolvedConfig } from "./config.js";
import { BoxtalApiError, BoxtalNetworkError, BoxtalTimeoutError } from "./errors.js";

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Per-request headers, merged on top of defaults. */
  headers?: Record<string, string>;
  /** Override the per-request timeout (ms). */
  timeoutMs?: number;
  /** Skip the retry loop for this call (e.g. for non-idempotent operations the caller doesn't want retried). */
  noRetry?: boolean;
  /** Per-request signal (composed with the timeout signal). */
  signal?: AbortSignal;
}

export type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<string | number | boolean>;

/** Low-level HTTP client. Returns parsed JSON, or `undefined` for empty/204 responses. */
export class HttpClient {
  constructor(private readonly cfg: ResolvedConfig) {}

  async request<T>(
    opts: RequestOptions,
    buildAuthHeader: () => Promise<string | undefined>,
  ): Promise<T> {
    const url = this.buildUrl(opts.path, opts.query);
    const headers = await this.buildHeaders(opts.headers, buildAuthHeader);
    const body = opts.body === undefined ? undefined : JSON.stringify(opts.body);
    const timeoutMs = opts.timeoutMs ?? this.cfg.timeoutMs;
    const retries = opts.noRetry ? 0 : this.cfg.retries.count;

    const init: RequestInit = { method: opts.method, headers };
    if (body !== undefined) init.body = body;

    let attempt = 0;
    let lastError: unknown;
    while (attempt <= retries) {
      const signal = composeSignal(opts.signal, timeoutMs);
      try {
        const response = await this.cfg.fetch(url, { ...init, signal });

        if (response.ok) {
          return (await parseJsonResponse(response)) as T;
        }

        const errorBody = await parseJsonResponse(response);
        const error = new BoxtalApiError({
          status: response.status,
          statusText: response.statusText,
          method: opts.method,
          url,
          headers: headersToObject(response.headers),
          body: errorBody,
        });

        if (attempt < retries && error.isServerError) {
          await delay(this.backoffMs(attempt));
          attempt++;
          continue;
        }
        throw error;
      } catch (err) {
        if (err instanceof BoxtalApiError) throw err;
        if (isAbort(err)) {
          // External abort (caller-provided signal) bubbles up as a timeout/network error;
          // we only treat the internal timeout signal as a retryable failure.
          if (opts.signal?.aborted) {
            throw new BoxtalTimeoutError("Request aborted", { cause: err });
          }
          if (attempt < retries) {
            await delay(this.backoffMs(attempt));
            attempt++;
            lastError = err;
            continue;
          }
          throw new BoxtalTimeoutError(`Request timed out after ${timeoutMs}ms`, { cause: err });
        }
        if (attempt < retries) {
          await delay(this.backoffMs(attempt));
          attempt++;
          lastError = err;
          continue;
        }
        throw new BoxtalNetworkError(
          err instanceof Error ? err.message : "Network request failed",
          { cause: err },
        );
      }
    }
    // Should be unreachable but TS needs a return.
    throw new BoxtalNetworkError("Exhausted retries", { cause: lastError });
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.cfg.baseUrl}${normalizedPath}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const item of value) url.searchParams.append(key, String(item));
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async buildHeaders(
    perRequest: Record<string, string> | undefined,
    buildAuthHeader: () => Promise<string | undefined>,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...this.cfg.defaultHeaders,
      ...(perRequest ?? {}),
    };
    const auth = await buildAuthHeader();
    if (auth) headers.Authorization = auth;
    return headers;
  }

  private backoffMs(attempt: number): number {
    const base = this.cfg.retries.initialBackoffMs * 2 ** attempt;
    return Math.min(base, this.cfg.retries.maxBackoffMs);
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function composeSignal(external: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!external) return timeoutSignal;
  // AbortSignal.any merges multiple signals (Node ≥ 20).
  return AbortSignal.any([external, timeoutSignal]);
}

function isAbort(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: unknown }).name;
  return name === "AbortError" || name === "TimeoutError";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

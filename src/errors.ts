import type { ApiErrorEntry } from "./types.js";

/** Base class for all errors thrown by the SDK. */
export class BoxtalError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BoxtalError";
  }
}

/** Thrown when the request was aborted (timeout or explicit abort). */
export class BoxtalTimeoutError extends BoxtalError {
  constructor(message = "Request timed out", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BoxtalTimeoutError";
  }
}

/** Thrown when the network failed before any response was received. */
export class BoxtalNetworkError extends BoxtalError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BoxtalNetworkError";
  }
}

/**
 * Thrown for any non-2xx HTTP response. Carries the parsed Boxtal error body
 * when available, plus the raw status and response body.
 */
export class BoxtalApiError extends BoxtalError {
  readonly status: number;
  readonly statusText: string;
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly errors: readonly ApiErrorEntry[];

  constructor(args: {
    status: number;
    statusText: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
  }) {
    const errors = extractErrors(args.body);
    const summary = errors[0]?.code ?? args.statusText ?? `HTTP ${args.status}`;
    super(`Boxtal API ${args.status} on ${args.method} ${args.url}: ${summary}`);
    this.name = "BoxtalApiError";
    this.status = args.status;
    this.statusText = args.statusText;
    this.method = args.method;
    this.url = args.url;
    this.headers = args.headers;
    this.body = args.body;
    this.errors = errors;
  }

  /** True when the failure is from the auth layer (401). */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when the request was syntactically wrong (400). */
  get isBadRequest(): boolean {
    return this.status === 400;
  }

  /** True when the request was functionally invalid (422 — most validation errors). */
  get isUnprocessable(): boolean {
    return this.status === 422;
  }

  /** True when the failure is server-side and may be retried (5xx). */
  get isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }
}

function extractErrors(body: unknown): readonly ApiErrorEntry[] {
  if (!body || typeof body !== "object") return [];
  const errs: unknown = (body as { errors?: unknown }).errors;
  return Array.isArray(errs) ? (errs as ApiErrorEntry[]) : [];
}

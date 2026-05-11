import { Buffer } from "node:buffer";

import type { ResolvedConfig } from "./config.js";
import { BoxtalApiError, BoxtalNetworkError, BoxtalTimeoutError } from "./errors.js";
import type { TokenResponse } from "./types.js";

const TOKEN_PATH = "/iam/account-app/token";
/** Refresh the token this many milliseconds before its declared expiry. */
const REFRESH_SAFETY_MS = 60_000;

interface CachedToken {
  accessToken: string;
  /** Absolute expiry timestamp in ms since epoch. */
  expiresAt: number;
}

/**
 * Builds Authorization headers. In "basic" mode every request carries Basic creds.
 * In "bearer" mode the client exchanges Basic creds for a short-lived access token at
 * POST /iam/account-app/token and caches it until shortly before expiry.
 */
export class TokenManager {
  private cached: CachedToken | undefined;
  private inflight: Promise<CachedToken> | undefined;
  /** Optional clock for testing (defaults to Date.now). */
  now: () => number = Date.now;

  constructor(private readonly cfg: ResolvedConfig) {}

  basicHeader(): string {
    const encoded = Buffer.from(`${this.cfg.accessKey}:${this.cfg.secretKey}`).toString("base64");
    return `Basic ${encoded}`;
  }

  /**
   * Returns the Authorization header to attach. For "bearer" mode this triggers
   * a token fetch on first use and on cache miss/expiry.
   */
  async authorizationHeader(): Promise<string> {
    if (this.cfg.auth === "basic") return this.basicHeader();
    const token = await this.getToken();
    return `Bearer ${token.accessToken}`;
  }

  /** Force a fresh token on the next request. Useful after a 401. */
  invalidate(): void {
    this.cached = undefined;
  }

  /** Returns a non-expired cached token, fetching one if needed. */
  async getToken(): Promise<CachedToken> {
    const cached = this.cached;
    if (cached && cached.expiresAt - REFRESH_SAFETY_MS > this.now()) {
      return cached;
    }
    this.inflight ??= this.fetchToken().finally(() => {
      this.inflight = undefined;
    });
    return this.inflight;
  }

  private async fetchToken(): Promise<CachedToken> {
    const url = `${this.cfg.baseUrl}${TOKEN_PATH}`;
    const signal = AbortSignal.timeout(this.cfg.timeoutMs);
    let response: Response;
    try {
      response = await this.cfg.fetch(url, {
        method: "POST",
        headers: {
          Authorization: this.basicHeader(),
          Accept: "application/json",
        },
        signal,
      });
    } catch (err) {
      if (isAbort(err)) {
        throw new BoxtalTimeoutError("Token request timed out", { cause: err });
      }
      throw new BoxtalNetworkError(
        err instanceof Error ? err.message : "Token request failed",
        { cause: err },
      );
    }

    if (!response.ok) {
      const text = await response.text();
      let body: unknown = text;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        /* keep text body */
      }
      throw new BoxtalApiError({
        status: response.status,
        statusText: response.statusText,
        method: "POST",
        url,
        headers: headersToObject(response.headers),
        body,
      });
    }

    const token = (await response.json()) as TokenResponse;
    if (!token.accessToken || typeof token.expiresIn !== "number") {
      throw new BoxtalNetworkError(
        "Token endpoint returned an unexpected payload (missing accessToken or expiresIn)",
      );
    }
    const cached: CachedToken = {
      accessToken: token.accessToken,
      expiresAt: this.now() + token.expiresIn * 1000,
    };
    this.cached = cached;
    return cached;
  }
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function isAbort(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: unknown }).name;
  return name === "AbortError" || name === "TimeoutError";
}

import { vi } from "vitest";

export interface FakeCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}

export interface FakeFetchOptions {
  /** Handler returning either a Response or a thrown error per call. */
  handler: (call: FakeCall, callIndex: number) => Response | Promise<Response>;
}

export function makeFakeFetch(opts: FakeFetchOptions) {
  const calls: FakeCall[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = headersToObject(init?.headers);
    const body = typeof init?.body === "string" ? init.body : undefined;
    const call: FakeCall = { url, method, headers, body };
    calls.push(call);
    return opts.handler(call, calls.length - 1);
  }) as unknown as typeof globalThis.fetch;
  return { fetch: fn, calls };
}

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(headers).entries()) },
  });
}

export function emptyResponse(status = 204): Response {
  return new Response(null, { status });
}

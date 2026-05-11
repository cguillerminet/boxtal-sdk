import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

import { BoxtalApiError, BoxtalClient, BoxtalNetworkError, BoxtalTimeoutError } from "../src/index.js";
import { jsonResponse, makeFakeFetch } from "./helpers.js";

const baseOpts = {
  accessKey: "access",
  secretKey: "secret",
  environment: "sandbox" as const,
  auth: "basic" as const,
  retries: { count: 0 },
};

describe("HttpClient", () => {
  it("targets the sandbox base URL and JSON content type by default", async () => {
    const { fetch, calls } = makeFakeFetch({
      handler: () => jsonResponse({ status: 200, content: [] }),
    });
    const client = new BoxtalClient({ ...baseOpts, fetch });

    await client.contentCategories.list();

    const call = calls[0];
    expect(call).toBeDefined();
    expect(call!.url).toBe("https://api.boxtal.build/shipping/v3.1/content-category");
    expect(call!.method).toBe("GET");
    expect(call!.headers.Accept).toBe("application/json");
    expect(call!.headers["Content-Type"]).toBe("application/json");
  });

  it("appends query parameters and serializes arrays as repeated keys", async () => {
    const { fetch, calls } = makeFakeFetch({
      handler: () => jsonResponse({ status: 200, content: [] }),
    });
    const client = new BoxtalClient({ ...baseOpts, fetch });

    await client.parcelPoints.searchByNetwork({
      countryIsoCode: "FR",
      city: "Paris",
      searchNetworks: ["MONR", "UPSE"],
    });

    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/shipping/v3.2/parcel-point-by-network");
    expect(url.searchParams.get("countryIsoCode")).toBe("FR");
    expect(url.searchParams.get("city")).toBe("Paris");
    expect(url.searchParams.getAll("searchNetworks")).toEqual(["MONR", "UPSE"]);
  });

  it("sends Basic auth when configured to skip the token exchange", async () => {
    const { fetch, calls } = makeFakeFetch({
      handler: () => jsonResponse({ status: 200 }),
    });
    const client = new BoxtalClient({ ...baseOpts, fetch });
    await client.contentCategories.list();
    expect(calls[0]!.headers.Authorization).toBe(`Basic ${Buffer.from("access:secret").toString("base64")}`);
  });

  it("throws BoxtalApiError carrying the parsed errors array on 4xx", async () => {
    const errBody = {
      status: 422,
      timestamp: "2026-05-11T08:00:00Z",
      errors: [{ code: "RequestValidationException", parameters: [{ field: "shipment.packages", value: null }] }],
    };
    const { fetch } = makeFakeFetch({
      handler: () => jsonResponse(errBody, 422),
    });
    const client = new BoxtalClient({ ...baseOpts, fetch });

    await expect(client.shippingOrders.get("missing-id")).rejects.toMatchObject({
      name: "BoxtalApiError",
      status: 422,
      isUnprocessable: true,
      errors: [{ code: "RequestValidationException" }],
    });
  });

  it("retries on 5xx and stops once retries are exhausted", async () => {
    let calls = 0;
    const { fetch } = makeFakeFetch({
      handler: () => {
        calls++;
        return jsonResponse({ errors: [{ code: "INTERNAL_SERVER_ERROR" }] }, 503);
      },
    });
    const client = new BoxtalClient({
      ...baseOpts,
      fetch,
      retries: { count: 2, initialBackoffMs: 1, maxBackoffMs: 1 },
    });

    await expect(client.contentCategories.list()).rejects.toBeInstanceOf(BoxtalApiError);
    expect(calls).toBe(3); // 1 attempt + 2 retries
  });

  it("does not retry POSTs (noRetry flag) even on 5xx", async () => {
    let calls = 0;
    const { fetch } = makeFakeFetch({
      handler: () => {
        calls++;
        return jsonResponse({ errors: [{ code: "INTERNAL_SERVER_ERROR" }] }, 500);
      },
    });
    const client = new BoxtalClient({
      ...baseOpts,
      fetch,
      retries: { count: 5, initialBackoffMs: 1, maxBackoffMs: 1 },
    });

    await expect(
      client.shippingOrders.create({ shippingOfferCode: "X", labelType: "PDF_A4" }),
    ).rejects.toBeInstanceOf(BoxtalApiError);
    expect(calls).toBe(1);
  });

  it("wraps network errors as BoxtalNetworkError", async () => {
    const fetch = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof globalThis.fetch;
    const client = new BoxtalClient({ ...baseOpts, fetch });
    await expect(client.contentCategories.list()).rejects.toBeInstanceOf(BoxtalNetworkError);
  });

  it("maps timeouts to BoxtalTimeoutError", async () => {
    const fetch = (async () => {
      const err = new Error("aborted");
      err.name = "TimeoutError";
      throw err;
    }) as unknown as typeof globalThis.fetch;
    const client = new BoxtalClient({ ...baseOpts, fetch, timeoutMs: 10 });
    await expect(client.contentCategories.list()).rejects.toBeInstanceOf(BoxtalTimeoutError);
  });

  it("returns undefined for empty 204 responses (e.g. DELETE)", async () => {
    const { fetch, calls } = makeFakeFetch({ handler: () => new Response(null, { status: 204 }) });
    const client = new BoxtalClient({ ...baseOpts, fetch });
    const result = await client.shippingOrders.cancel("abc/123");
    expect(result).toBeUndefined();
    expect(calls[0]!.url).toBe("https://api.boxtal.build/shipping/v3.1/shipping-order/abc%2F123");
    expect(calls[0]!.method).toBe("DELETE");
  });

  it("respects defaultHeaders and per-request headers", async () => {
    const { fetch, calls } = makeFakeFetch({ handler: () => jsonResponse({}) });
    const client = new BoxtalClient({
      ...baseOpts,
      fetch,
      defaultHeaders: { "X-Trace": "abc" },
    });
    await client.request({ method: "GET", path: "/shipping/v3.1/subscription", headers: { "X-Custom": "1" } });
    expect(calls[0]!.headers["X-Trace"]).toBe("abc");
    expect(calls[0]!.headers["X-Custom"]).toBe("1");
  });

  it("rejects when baseUrl points to a non-Boxtal host but still hits the override", async () => {
    const { fetch, calls } = makeFakeFetch({ handler: () => jsonResponse({}) });
    const client = new BoxtalClient({
      ...baseOpts,
      baseUrl: "https://mock.example/api",
      fetch,
    });
    await client.contentCategories.list();
    expect(calls[0]!.url.startsWith("https://mock.example/api/")).toBe(true);
  });
});

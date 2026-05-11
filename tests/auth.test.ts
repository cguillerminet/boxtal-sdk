import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

import { BoxtalApiError, BoxtalClient } from "../src/index.js";
import { jsonResponse, makeFakeFetch } from "./helpers.js";

const opts = {
  accessKey: "ACCESS",
  secretKey: "SECRET",
  environment: "sandbox" as const,
  retries: { count: 0 },
};

describe("TokenManager", () => {
  it("exchanges Basic creds for a Bearer token and caches it across requests", async () => {
    let tokenCalls = 0;
    const { fetch, calls } = makeFakeFetch({
      handler: (call) => {
        if (call.url.endsWith("/iam/account-app/token")) {
          tokenCalls++;
          return jsonResponse({ accessToken: "TOKEN-1", tokenType: "Bearer", expiresIn: 3600 });
        }
        return jsonResponse({ status: 200, content: [] });
      },
    });
    const client = new BoxtalClient({ ...opts, fetch });

    await client.contentCategories.list();
    await client.contentCategories.list();
    await client.subscriptions.list();

    expect(tokenCalls).toBe(1);
    const authzs = calls
      .filter((c) => !c.url.endsWith("/iam/account-app/token"))
      .map((c) => c.headers.Authorization);
    expect(authzs).toEqual(["Bearer TOKEN-1", "Bearer TOKEN-1", "Bearer TOKEN-1"]);

    // Token call itself uses Basic auth with base64 of access:secret.
    const tokenCall = calls.find((c) => c.url.endsWith("/iam/account-app/token"));
    expect(tokenCall!.headers.Authorization).toBe(`Basic ${Buffer.from("ACCESS:SECRET").toString("base64")}`);
    expect(tokenCall!.method).toBe("POST");
  });

  it("refreshes the token once it has expired", async () => {
    let issued = 0;
    const { fetch } = makeFakeFetch({
      handler: (call) => {
        if (call.url.endsWith("/iam/account-app/token")) {
          issued++;
          return jsonResponse({ accessToken: `T-${issued}`, tokenType: "Bearer", expiresIn: 1 });
        }
        return jsonResponse({ status: 200, content: [] });
      },
    });
    const client = new BoxtalClient({ ...opts, fetch });

    await client.contentCategories.list();
    // Force expiry by invalidating the cache.
    client.invalidateToken();
    await client.contentCategories.list();

    expect(issued).toBe(2);
  });

  it("dedupes concurrent token fetches into a single inflight request", async () => {
    let inflight = 0;
    let maxInflight = 0;
    const { fetch } = makeFakeFetch({
      handler: async (call) => {
        if (call.url.endsWith("/iam/account-app/token")) {
          inflight++;
          maxInflight = Math.max(maxInflight, inflight);
          await new Promise((r) => setTimeout(r, 10));
          inflight--;
          return jsonResponse({ accessToken: "T", tokenType: "Bearer", expiresIn: 3600 });
        }
        return jsonResponse({ status: 200, content: [] });
      },
    });
    const client = new BoxtalClient({ ...opts, fetch });

    await Promise.all([
      client.contentCategories.list(),
      client.contentCategories.list(),
      client.contentCategories.list(),
    ]);

    expect(maxInflight).toBe(1);
  });

  it("propagates auth failures from the token endpoint as BoxtalApiError", async () => {
    const { fetch } = makeFakeFetch({
      handler: (call) => {
        if (call.url.endsWith("/iam/account-app/token")) {
          return jsonResponse({ errors: [{ code: "INVALID_CREDENTIALS" }] }, 401);
        }
        return jsonResponse({});
      },
    });
    const client = new BoxtalClient({ ...opts, fetch });
    await expect(client.contentCategories.list()).rejects.toMatchObject({
      name: "BoxtalApiError",
      status: 401,
      isUnauthorized: true,
    });
    // Sanity check: the assertion class is BoxtalApiError.
    await expect(client.contentCategories.list()).rejects.toBeInstanceOf(BoxtalApiError);
  });
});

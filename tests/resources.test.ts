import { describe, expect, it } from "vitest";

import { BoxtalClient } from "../src/index.js";
import type { CreateShippingOrderRequest, Subscription } from "../src/index.js";
import { jsonResponse, makeFakeFetch } from "./helpers.js";

const baseOpts = {
  accessKey: "k",
  secretKey: "s",
  environment: "sandbox" as const,
  auth: "basic" as const,
  retries: { count: 0 },
};

describe("Resource methods route to the documented v3 endpoints", () => {
  it("content-category list", async () => {
    const { fetch, calls } = makeFakeFetch({ handler: () => jsonResponse({ content: [] }) });
    const client = new BoxtalClient({ ...baseOpts, fetch });
    await client.contentCategories.list({ language: "fr" });
    expect(new URL(calls[0]!.url).pathname).toBe("/shipping/v3.1/content-category");
    expect(new URL(calls[0]!.url).searchParams.get("language")).toBe("fr");
  });

  it("parcel-point search v1", async () => {
    const { fetch, calls } = makeFakeFetch({ handler: () => jsonResponse({ content: [] }) });
    const client = new BoxtalClient({ ...baseOpts, fetch });
    await client.parcelPoints.search({ countryIsoCode: "FR", city: "Lyon", postalCode: "69000" });
    const u = new URL(calls[0]!.url);
    expect(u.pathname).toBe("/shipping/v3.1/parcel-point");
    expect(u.searchParams.get("countryIsoCode")).toBe("FR");
    expect(u.searchParams.get("city")).toBe("Lyon");
    expect(u.searchParams.get("postalCode")).toBe("69000");
  });

  it("parcel-point by-shipping-offer v2", async () => {
    const { fetch, calls } = makeFakeFetch({ handler: () => jsonResponse({ content: [] }) });
    const client = new BoxtalClient({ ...baseOpts, fetch });
    await client.parcelPoints.searchByShippingOffer({
      countryIsoCode: "FR",
      operationType: "DROP_OFF",
      shippingOfferCode: "MONR-HOMEDELIVERY",
    });
    expect(new URL(calls[0]!.url).pathname).toBe("/shipping/v3.2/parcel-point-by-shipping-offer");
  });

  it("shipping-order create / get / cancel / documents / tracking", async () => {
    const { fetch, calls } = makeFakeFetch({
      handler: (call) => {
        if (call.method === "DELETE") return new Response(null, { status: 204 });
        return jsonResponse({ status: 200, content: {} });
      },
    });
    const client = new BoxtalClient({ ...baseOpts, fetch });
    const body: CreateShippingOrderRequest = {
      shippingOfferCode: "MONR",
      labelType: "PDF_A4",
    };
    await client.shippingOrders.create(body);
    await client.shippingOrders.get("ORD-1");
    await client.shippingOrders.getDocuments("ORD-1");
    await client.shippingOrders.getTracking("ORD-1");
    await client.shippingOrders.cancel("ORD-1");

    expect(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual([
      "POST /shipping/v3.1/shipping-order",
      "GET /shipping/v3.1/shipping-order/ORD-1",
      "GET /shipping/v3.1/shipping-order/ORD-1/shipping-document",
      "GET /shipping/v3.1/shipping-order/ORD-1/tracking",
      "DELETE /shipping/v3.1/shipping-order/ORD-1",
    ]);
    expect(calls[0]!.body).toBe(JSON.stringify(body));
  });

  it("subscriptions list / create / update / delete", async () => {
    const { fetch, calls } = makeFakeFetch({
      handler: (c) => (c.method === "DELETE" ? new Response(null, { status: 204 }) : jsonResponse({})),
    });
    const client = new BoxtalClient({ ...baseOpts, fetch });
    const sub: Subscription = {
      eventType: "TRACKING_CHANGED",
      callbackUrl: "https://example.com/hook",
      webhookSecret: "topsecret",
    };
    await client.subscriptions.list();
    await client.subscriptions.create(sub);
    await client.subscriptions.update("sub-42", {
      eventType: "TRACKING_CHANGED",
      callbackUrl: "https://example.com/hook-v2",
    });
    await client.subscriptions.delete("sub-42");
    expect(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual([
      "GET /shipping/v3.1/subscription",
      "POST /shipping/v3.1/subscription",
      "PUT /shipping/v3.1/subscription/sub-42",
      "DELETE /shipping/v3.1/subscription/sub-42",
    ]);
  });
});

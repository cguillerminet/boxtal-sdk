import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { computeWebhookSignature, verifyWebhookSignature } from "../src/index.js";

const SECRET = "topsecret";
const PAYLOAD = JSON.stringify({
  id: "evt_1",
  type: "TRACKING_CHANGED",
  shippingOrderId: "ORD-1",
  payload: { trackings: [] },
});

describe("webhook signature", () => {
  it("computes the hex-encoded HMAC-SHA256 of the raw body", () => {
    const expected = createHmac("sha256", SECRET).update(PAYLOAD).digest("hex");
    expect(computeWebhookSignature(PAYLOAD, SECRET)).toBe(expected);
  });

  it("verifies a valid signature", () => {
    const sig = computeWebhookSignature(PAYLOAD, SECRET);
    expect(verifyWebhookSignature(PAYLOAD, sig, SECRET)).toBe(true);
  });

  it("rejects a bad signature", () => {
    expect(verifyWebhookSignature(PAYLOAD, "00".repeat(32), SECRET)).toBe(false);
  });

  it("rejects missing or array header values", () => {
    expect(verifyWebhookSignature(PAYLOAD, undefined, SECRET)).toBe(false);
    expect(verifyWebhookSignature(PAYLOAD, ["a", "b"], SECRET)).toBe(false);
  });

  it("rejects when the secret is wrong", () => {
    const sig = computeWebhookSignature(PAYLOAD, SECRET);
    expect(verifyWebhookSignature(PAYLOAD, sig, "wrongsecret")).toBe(false);
  });

  it("rejects when the payload was tampered with", () => {
    const sig = computeWebhookSignature(PAYLOAD, SECRET);
    expect(verifyWebhookSignature(PAYLOAD + "x", sig, SECRET)).toBe(false);
  });

  it("rejects non-hex signature input", () => {
    expect(verifyWebhookSignature(PAYLOAD, "not-hex!!", SECRET)).toBe(false);
  });
});

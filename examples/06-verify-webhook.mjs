// Demonstrates how to verify the `x-bxt-signature` header on an incoming
// Boxtal webhook callback. No network — purely local.
//
// Run: npm run build && node examples/06-verify-webhook.mjs
import {
  computeWebhookSignature,
  verifyWebhookSignature,
} from "../dist/index.js";

const SECRET = "demo-secret-please-rotate";

// In your server, this is the *raw* request body bytes — do NOT JSON.parse and
// re-stringify it. With express, use `express.raw({ type: "application/json" })`.
const rawBody = JSON.stringify({
  id: "evt_abc123",
  type: "TRACKING_CHANGED",
  shippingOrderId: "order_42",
  payload: {
    trackings: [
      { status: "IN_TRANSIT", packageId: "pkg_1", trackingDateTime: new Date().toISOString() },
    ],
  },
});

const signatureHeader = computeWebhookSignature(rawBody, SECRET);
console.log("Boxtal would send  x-bxt-signature:", signatureHeader);

console.log("verify (valid):    ", verifyWebhookSignature(rawBody, signatureHeader, SECRET));
console.log("verify (tampered): ", verifyWebhookSignature(rawBody + "x", signatureHeader, SECRET));
console.log("verify (wrong key):", verifyWebhookSignature(rawBody, signatureHeader, "other-secret"));
console.log("verify (missing):  ", verifyWebhookSignature(rawBody, undefined, SECRET));

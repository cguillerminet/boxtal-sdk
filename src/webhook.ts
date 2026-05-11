import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

/**
 * Verifies the `x-bxt-signature` header on an incoming Boxtal webhook callback.
 *
 * Boxtal signs the raw JSON body with HMAC-SHA256 using the `webhookSecret` you
 * supplied when creating the subscription. The header value is the hexadecimal
 * digest. Use the *raw* request body (bytes or string) — re-serializing JSON
 * almost certainly changes whitespace/key order and breaks the signature.
 *
 * @example
 *   const raw = await readRawBody(req);
 *   if (!verifyWebhookSignature(raw, req.headers["x-bxt-signature"], secret)) {
 *     res.statusCode = 401;
 *     return;
 *   }
 *   const event = JSON.parse(raw) as WebhookEventPayload;
 */
export function verifyWebhookSignature(
  rawBody: string | Uint8Array | Buffer,
  signature: string | string[] | undefined,
  webhookSecret: string,
): boolean {
  if (!signature || Array.isArray(signature)) return false;
  if (!webhookSecret) return false;

  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest();

  // The header value is hex-encoded per the API documentation.
  let provided: Buffer;
  try {
    provided = Buffer.from(signature.trim(), "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/** Returns the hex-encoded HMAC-SHA256 signature Boxtal would compute for a body. */
export function computeWebhookSignature(
  rawBody: string | Uint8Array | Buffer,
  webhookSecret: string,
): string {
  return createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
}

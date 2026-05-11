# @l1l1/boxtal-sdk

TypeScript SDK for the [Boxtal API v3](https://developer.boxtal.com/fr/fr/apiv3/guide/getting-started-api-v3) — JSON over HTTPS.
Zero runtime dependencies, ESM, Node.js ≥ 22 (uses native `fetch`, `AbortSignal.timeout/any`, `node:crypto`, `Buffer`).

## Install & build

```bash
npm install
npm run build
```

## Quick start

```ts
import { BoxtalClient } from "@l1l1/boxtal-sdk";

const client = new BoxtalClient({
  accessKey: process.env.BOXTAL_ACCESS_KEY!,
  secretKey: process.env.BOXTAL_SECRET_KEY!,
  environment: "sandbox", // or "production" (default)
});

const points = await client.parcelPoints.searchByNetwork({
  countryIsoCode: "FR",
  city: "Paris",
  postalCode: "75001",
  searchNetworks: ["MONR"],
});
```

## Environments

|              | Base URL                   |
|--------------|----------------------------|
| `sandbox`    | `https://api.boxtal.build` |
| `production` | `https://api.boxtal.com`   |

## Authentication

By default the client exchanges your `accessKey` / `secretKey` for a short-lived
Bearer token at `POST /iam/account-app/token` and caches it until ~60 seconds
before expiry. Concurrent requests share a single in-flight token fetch.

Pass `auth: "basic"` to skip the token exchange and send Basic auth on every
request — Boxtal accepts both. `client.invalidateToken()` forces a refresh.

## Resources

| Resource                | Methods                                                            |
|-------------------------|--------------------------------------------------------------------|
| `contentCategories`     | `list({ language? })`                                              |
| `parcelPoints`          | `search`, `searchByNetwork`, `searchByShippingOffer`               |
| `shippingOrders`        | `create`, `get`, `cancel`, `getDocuments`, `getTracking`           |
| `subscriptions`         | `list`, `create`, `update`, `delete`                               |

For anything not covered, use the typed escape hatch:

```ts
const res = await client.request<MyType>({
  method: "GET",
  path: "/shipping/v3.1/anything-new",
  query: { foo: "bar" },
});
```

## Errors

Every non-2xx response throws `BoxtalApiError` carrying `status`,
`statusText`, parsed `body`, and the structured `errors` array from the API.
Convenience getters: `isUnauthorized` (401), `isBadRequest` (400),
`isUnprocessable` (422), `isServerError` (5xx).

Network failures throw `BoxtalNetworkError`; timeouts (default 30s) throw
`BoxtalTimeoutError`. All inherit from `BoxtalError`.

5xx responses are retried (default 2 retries, exponential backoff starting at
200ms). `POST`/`PUT`/`DELETE` are *not* retried — they are non-idempotent.

## Webhooks

```ts
import { verifyWebhookSignature, type WebhookEventPayload } from "@l1l1/boxtal-sdk";

app.post("/boxtal-webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!verifyWebhookSignature(req.body, req.headers["x-bxt-signature"], process.env.WEBHOOK_SECRET!)) {
    return res.sendStatus(401);
  }
  const event = JSON.parse(req.body.toString()) as WebhookEventPayload;
  // event.type === "DOCUMENT_CREATED" | "TRACKING_CHANGED"
  res.sendStatus(200);
});
```

Verification uses the raw request bytes; do **not** re-serialize the JSON.

## Configuration

```ts
new BoxtalClient({
  accessKey, secretKey,
  environment: "sandbox" | "production",   // default "production"
  baseUrl: "https://...",                  // overrides environment
  auth: "bearer" | "basic",                // default "bearer"
  timeoutMs: 30_000,
  retries: { count: 2, initialBackoffMs: 200, maxBackoffMs: 2_000 },
  fetch: globalThis.fetch,                 // injectable for tests
  defaultHeaders: { "X-Trace": "abc" },
});
```

## Examples

Sandbox-ready scripts live in [`examples/`](./examples). Set `BOXTAL_ACCESS_KEY`
and `BOXTAL_SECRET_KEY` in `.env`, `npm run build`, then:

```bash
node examples/01-list-content-categories.mjs
node examples/02-search-parcel-points.mjs
node examples/04-manage-subscription.mjs        # full subscription CRUD cycle
node examples/05-create-shipping-order.mjs      # dry-run; --send to POST
node examples/06-verify-webhook.mjs             # local only
```

See [`examples/README.md`](./examples/README.md) for details.

## Scripts

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # vitest run
npm run build       # tsc → dist/
```

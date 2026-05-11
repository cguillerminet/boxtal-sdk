# Examples

Runnable scripts against the **sandbox** (`https://api.boxtal.build`).

## Setup

Drop your sandbox credentials in `.env` at the repo root:

```env
BOXTAL_ACCESS_KEY=...
BOXTAL_SECRET_KEY=...
```

Build the SDK once (examples import from `../dist/index.js`):

```bash
npm run build
```

## Running

```bash
node examples/01-list-content-categories.mjs
node examples/02-search-parcel-points.mjs
node examples/03-list-subscriptions.mjs
node examples/04-manage-subscription.mjs          # creates → updates → deletes (sandbox-safe)
node examples/05-create-shipping-order.mjs        # dry-run; --send to POST
node examples/06-verify-webhook.mjs               # local only (no network)
```

## What each one shows

| File | Demonstrates |
|------|--------------|
| `01-list-content-categories.mjs` | Simplest call: `client.contentCategories.list({ language })`. |
| `02-search-parcel-points.mjs`    | v3.1 free-form parcel-point search. Optionally exercises v3.2 by-network / by-shipping-offer when you pass `SEARCH_NETWORKS=` / `SHIPPING_OFFER_CODE=`. |
| `03-list-subscriptions.mjs`      | Reads the current webhook subscriptions on the account. |
| `04-manage-subscription.mjs`     | Full subscription CRUD lifecycle. Leaves the sandbox in its original state. |
| `05-create-shipping-order.mjs`   | Dry-runs the create flow. Run with `--send SHIPPING_OFFER_CODE=YOURCODE` to actually create → fetch → list documents → cancel an order. |
| `06-verify-webhook.mjs`          | Local-only: HMAC-SHA256 signature compute + verify for incoming webhooks. |

## Account-scoped values

A few v3 endpoints require codes that aren't free-form:

- `SHIPPING_OFFER_CODE` (used by `parcelPoints.searchByShippingOffer` and
  `shippingOrders.create`) — these are tied to your activated contracts and
  are listed in the Boxtal developer portal.
- `SEARCH_NETWORKS` (used by `parcelPoints.searchByNetwork`) — also account-scoped.
  Note that the carrier codes you'll see surfaced in v3.1 search results
  (`MONR`, `POFR`, `UPSE`, …) are **not** valid as `searchNetworks` values.

If you pass an unknown value the API responds with
`ValidationException.ValidShippingOfferCode` or `ValidationException.ValidParcelPointNetwork`.
Examples 02 and 05 catch these and explain what's happening.

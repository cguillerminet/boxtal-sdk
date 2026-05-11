// Searches for parcel points around an address.
//
// The v3.1 endpoint works without any account-specific input.
// The v3.2 endpoints (`by-network`, `by-shipping-offer`) require codes that are
// scoped to your account contracts and aren't discoverable through the API:
//   - searchNetworks  → valid values: see your contracts in the developer portal.
//   - shippingOfferCode → idem.
// Override via env vars to exercise them: SEARCH_NETWORKS, SHIPPING_OFFER_CODE.
//
// Run: npm run build && node examples/02-search-parcel-points.mjs
import { BoxtalApiError, BoxtalClient } from "../dist/index.js";
import { makeClientOptions } from "./_env.mjs";

const client = new BoxtalClient(makeClientOptions());

const address = {
  countryIsoCode: "FR",
  city: "Paris",
  postalCode: "75001",
  street: "Rue de Rivoli",
  number: "1",
};

console.log("--- v3.1 GET /shipping/v3.1/parcel-point ---");
const v1 = await client.parcelPoints.search(address);
const seenNetworks = new Set();
for (const item of (v1.content ?? []).slice(0, 5)) {
  const p = item.parcelPoint;
  if (p?.network) seenNetworks.add(p.network);
  console.log(
    `  [${p?.network ?? "?"}] ${p?.code?.padEnd(8) ?? ""} ${p?.name ?? ""}` +
      ` — ${p?.location?.street ?? ""}, ${p?.location?.city ?? ""}` +
      ` (${item.distanceFromSearchLocation ?? "?"} m)`,
  );
}
console.log(`  ...${v1.content?.length ?? 0} total\n`);

const networks = process.env.SEARCH_NETWORKS?.split(",").map((s) => s.trim()).filter(Boolean);
if (networks?.length) {
  console.log(`--- v3.2 GET /shipping/v3.2/parcel-point-by-network (${networks.join(",")}) ---`);
  try {
    const v2 = await client.parcelPoints.searchByNetwork({ ...address, searchNetworks: networks });
    for (const item of (v2.content ?? []).slice(0, 5)) {
      const p = item.parcelPoint;
      console.log(
        `  ${p?.code?.padEnd(8) ?? ""} ${p?.name ?? ""}` +
          ` — networks=${(p?.compatibleNetworks ?? []).join(",")}` +
          ` (${item.distanceFromSearchLocation ?? "?"} m)`,
      );
    }
    console.log(`  ...${v2.content?.length ?? 0} total`);
  } catch (err) {
    explainAccountScopedError(err, "searchNetworks");
  }
} else {
  console.log("(skip) Set SEARCH_NETWORKS=ABCD,EFGH to exercise v3.2 by-network.");
}

const offerCode = process.env.SHIPPING_OFFER_CODE;
if (offerCode) {
  console.log(`\n--- v3.2 GET /shipping/v3.2/parcel-point-by-shipping-offer (${offerCode}, DEPARTURE) ---`);
  try {
    const v2 = await client.parcelPoints.searchByShippingOffer({
      ...address,
      operationType: "DEPARTURE",
      shippingOfferCode: offerCode,
    });
    console.log(`  ${v2.content?.length ?? 0} points for offer ${offerCode}`);
  } catch (err) {
    explainAccountScopedError(err, "shippingOfferCode");
  }
} else {
  console.log("(skip) Set SHIPPING_OFFER_CODE=... to exercise v3.2 by-shipping-offer.");
}

console.log(`\nNetworks observed in v3.1 response: ${[...seenNetworks].join(", ") || "(none)"}`);

function explainAccountScopedError(err, field) {
  if (err instanceof BoxtalApiError) {
    const param = err.body?.errors?.[0]?.parameters?.find((p) => p?.field === field);
    if (param) {
      console.log(`  ${err.status} ${param.code} — value=${JSON.stringify(param.value)}`);
      console.log(`  This field is account-scoped: valid values come from your contracts in the developer portal.`);
      return;
    }
  }
  throw err;
}

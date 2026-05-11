// End-to-end shipping order flow on the sandbox: create → fetch → docs → tracking → cancel.
//
// Boxtal v3 does NOT expose an "offer search" endpoint. You must already know a
// valid `shippingOfferCode` (or `shippingOfferId`) for your sandbox account —
// they are listed in the developer portal under your contracts.
//
// By default this script only prints the request it would send. Pass
// `--send` (or set BOXTAL_CREATE_ORDER=1) to actually POST it.
//
// Run:
//   npm run build && node examples/05-create-shipping-order.mjs
//   npm run build && SHIPPING_OFFER_CODE=YOUR_CODE node examples/05-create-shipping-order.mjs --send
import { BoxtalApiError, BoxtalClient } from "../dist/index.js";
import { makeClientOptions } from "./_env.mjs";

const send = process.argv.includes("--send") || process.env.BOXTAL_CREATE_ORDER === "1";
const shippingOfferCode = process.env.SHIPPING_OFFER_CODE ?? "REPLACE_WITH_YOUR_OFFER_CODE";

const client = new BoxtalClient(makeClientOptions());

/** @type {import("../dist/index.js").CreateShippingOrderRequest} */
const request = {
  labelType: "PDF_A4",
  shippingOfferCode,
  shipment: {
    externalId: `demo-${Date.now()}`,
    packages: [
      {
        type: "PARCEL",
        weight: 1.2,
        width: 20,
        length: 30,
        height: 10,
        value: { value: 25, currency: "EUR" },
      },
    ],
    fromAddress: {
      type: "BUSINESS",
      contact: {
        firstName: "Jane",
        lastName: "Sender",
        email: "sender@example.com",
        phone: "+33612345678",
        company: "Acme Sandbox",
      },
      location: {
        number: "1",
        street: "Rue de Rivoli",
        city: "Paris",
        postalCode: "75001",
        countryIsoCode: "FR",
      },
    },
    toAddress: {
      type: "RESIDENTIAL",
      contact: {
        firstName: "John",
        lastName: "Recipient",
        email: "recipient@example.com",
        phone: "+33687654321",
      },
      location: {
        number: "10",
        street: "Cours Mirabeau",
        city: "Aix-en-Provence",
        postalCode: "13100",
        countryIsoCode: "FR",
      },
    },
  },
};

console.log("Request body that would be POSTed to /shipping/v3.1/shipping-order:");
console.log(JSON.stringify(request, null, 2));

if (!send) {
  console.log("\n(dry-run) Pass --send to actually create the order.");
  process.exit(0);
}

try {
  console.log(`\nCreating shipping order (offer=${shippingOfferCode})...`);
  const created = await client.shippingOrders.create(request);
  const order = created.content;
  if (!order?.id) {
    console.error("Order created without an id — cannot continue.");
    console.error(JSON.stringify(created, null, 2));
    process.exit(1);
  }
  console.log(`  id=${order.id} status=${order.status}`);
  if (order.deliveryPriceExclTax) {
    console.log(
      `  delivery price: ${order.deliveryPriceExclTax.value} ${order.deliveryPriceExclTax.currency}`,
    );
  }

  console.log("Fetching the order back...");
  const fetched = await client.shippingOrders.get(order.id);
  console.log(`  status=${fetched.content?.status}`);

  console.log("Listing shipping documents (often empty until labels generate)...");
  try {
    const docs = await client.shippingOrders.getDocuments(order.id);
    for (const doc of docs.content ?? []) {
      console.log(`  ${doc.type?.padEnd(8) ?? "?"} ${doc.format ?? ""} ${doc.url ?? ""}`);
    }
  } catch (err) {
    if (err instanceof BoxtalApiError && err.isUnprocessable) {
      console.log(`  no documents yet (${err.errors[0]?.code ?? err.status})`);
    } else throw err;
  }

  console.log("Cancelling the order to leave the sandbox clean...");
  await client.shippingOrders.cancel(order.id);
  console.log("  cancelled.");
} catch (err) {
  if (err instanceof BoxtalApiError) {
    console.error(`Boxtal API ${err.status} ${err.statusText} on ${err.method} ${err.url}`);
    console.error("errors:", JSON.stringify(err.errors, null, 2));
    process.exit(2);
  }
  throw err;
}

// Creates a webhook subscription on the sandbox, updates it, then deletes it.
// Safe to run repeatedly — each run leaves the account in its original state.
// Run: npm run build && node examples/04-manage-subscription.mjs
import { BoxtalClient } from "../dist/index.js";
import { makeClientOptions } from "./_env.mjs";

const client = new BoxtalClient(makeClientOptions());

console.log("Creating a TRACKING_CHANGED subscription...");
const created = await client.subscriptions.create({
  eventType: "TRACKING_CHANGED",
  callbackUrl: "https://example.com/boxtal/webhook",
  webhookSecret: "demo-secret-please-rotate",
});
const sub = created.content;
console.log(`  created id=${sub?.id} status=${sub?.status}`);

if (!sub?.id) {
  console.error("Subscription was created without an id — bailing out.");
  process.exit(1);
}

console.log("Updating callback URL...");
const updated = await client.subscriptions.update(sub.id, {
  eventType: "TRACKING_CHANGED",
  callbackUrl: "https://example.com/boxtal/webhook?v=2",
});
console.log(`  new URL: ${updated.content?.callbackUrl}`);

console.log("Deleting subscription...");
await client.subscriptions.delete(sub.id);
console.log("  done.");

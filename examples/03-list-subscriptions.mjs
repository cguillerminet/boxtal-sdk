// Lists existing webhook subscriptions on the sandbox account.
// Run: npm run build && node examples/03-list-subscriptions.mjs
import { BoxtalClient } from "../dist/index.js";
import { makeClientOptions } from "./_env.mjs";

const client = new BoxtalClient(makeClientOptions());

const response = await client.subscriptions.list();
const subs = response.content ?? [];

if (!subs.length) {
  console.log("No webhook subscriptions on this account.");
  process.exit(0);
}

console.log(`${subs.length} subscription(s):`);
for (const sub of subs) {
  console.log(
    `  ${sub.id} ${sub.status?.padEnd(10)} ${sub.eventType?.padEnd(18)} → ${sub.callbackUrl}`,
  );
}

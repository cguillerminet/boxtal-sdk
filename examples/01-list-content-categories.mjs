// Lists the content categories Boxtal accepts on shipments.
// Run: npm run build && node examples/01-list-content-categories.mjs
import { BoxtalClient } from "../dist/index.js";
import { makeClientOptions } from "./_env.mjs";

const client = new BoxtalClient(makeClientOptions());

const response = await client.contentCategories.list({ language: "fr" });

console.log(`Status: ${response.status} — ${response.content?.length ?? 0} categories`);
for (const cat of response.content ?? []) {
  console.log(`  ${cat.id?.padEnd(36)} ${cat.label ?? ""}`);
}

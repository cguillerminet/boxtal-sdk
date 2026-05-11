// Tiny zero-dep .env loader for the examples. Looks for the project root .env
// and populates process.env only for keys that aren't already set.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", ".env");

try {
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
} catch (err) {
  if (err?.code !== "ENOENT") throw err;
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}. Set it in .env or your shell.`);
    process.exit(1);
  }
  return value;
}

export function makeClientOptions() {
  return {
    accessKey: requireEnv("BOXTAL_ACCESS_KEY"),
    secretKey: requireEnv("BOXTAL_SECRET_KEY"),
    environment: "sandbox",
  };
}

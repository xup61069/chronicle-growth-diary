import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const publicDir = resolve(process.cwd(), "dist/public");
const assetsDir = resolve(publicDir, "assets");
const routeChunks = ["DiaryEditor", "FamilyInvite", "GrowthDashboard", "QuickNote", "SharedStory", "NotFound"];

if (!existsSync(publicDir) || !existsSync(assetsDir)) {
  throw new Error("Missing Vite production output. Run vite build before verifying lazy route chunks.");
}

const indexHtml = readFileSync(resolve(publicDir, "index.html"), "utf8");
const entryMatch = indexHtml.match(/<script[^>]+src="\/(assets\/index-[^"]+\.js)"/);
if (!entryMatch?.[1]) throw new Error("Production HTML is missing the hashed application entry module.");

const entry = readFileSync(resolve(publicDir, entryMatch[1]), "utf8");
const assetFiles = readdirSync(assetsDir);
const missing = [];

for (const routeChunk of routeChunks) {
  const chunk = assetFiles.find((file) => new RegExp(`^${routeChunk}-[A-Za-z0-9_-]+\\.js$`).test(file));
  if (!chunk || !entry.includes(chunk)) missing.push(routeChunk);
}

if (missing.length > 0) {
  throw new Error(`Production entry does not resolve required lazy route chunks: ${missing.join(", ")}`);
}

if (assetFiles.some((file) => /^charts-[A-Za-z0-9_-]+\.js$/.test(file))) {
  throw new Error("Unexpected charts manual chunk found. Keep Recharts inside the lazy dashboard route to avoid runtime initialization cycles.");
}

console.log(`Verified ${routeChunks.length} lazy route chunks in ${entryMatch[1]}.`);

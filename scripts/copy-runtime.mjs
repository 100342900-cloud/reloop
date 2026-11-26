import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sites = ["hub", "reuse", "repair", "cargo", "ally"];

for (const site of sites) {
  const dest = path.join(root, "sites", site, "runtime");
  await mkdir(dest, { recursive: true });
  await cp(path.join(root, "vendor", "runtime"), dest, { recursive: true });
}

await cp(
  path.join(root, "kit", "opendeal", "opendeal.js"),
  path.join(root, "sites", "hub", "opendeal.js"),
);

console.log("Copied official runtime into each site and OpenDeal into the hub.");

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builder = path.join(root, "vendor", "scripts", "build_network.mjs");

const jobs = [
  ["hub", "reloop_hub.hocon"],
  ["reuse", "spoke_and_salvage.hocon"],
  ["repair", "tuesday_workshop.hocon"],
  ["cargo", "river_runners.hocon"],
  ["ally", "allied_cycles.hocon"],
];

function run(site, hocon) {
  const cwd = path.join(root, "sites", site);
  const args = [
    builder,
    hocon,
    "--manifest",
    "agent-manifest.json",
    "--runtime",
    "runtime",
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${site}: build_network exited ${code}`));
    });
  });
}

for (const [site, hocon] of jobs) {
  console.log(`\n=== Building ${site} ===`);
  await run(site, hocon);
}
console.log("\nAll networks built.");

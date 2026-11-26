import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serve = path.join(root, "scripts", "serve-site.mjs");
const origins = JSON.parse(await readFile(path.join(root, "origins.json"), "utf8"));

const children = [];

function start(id, site) {
  const args = [
    serve,
    path.join(root, "sites", id),
    "--host",
    site.host,
    "--port",
    String(site.port),
    "--open-as",
    site.host,
  ];
  const child = spawn(process.execPath, args, { stdio: "inherit" });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${id} server exited ${code}`);
    }
  });
  children.push(child);
  console.log(`Serving ${site.name} at http://${site.host}:${site.port}/`);
}

for (const [id, site] of Object.entries(origins.sites)) {
  start(id, site);
}

function shutdown() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => { shutdown(); process.exit(0); });
process.on("SIGTERM", () => { shutdown(); process.exit(0); });

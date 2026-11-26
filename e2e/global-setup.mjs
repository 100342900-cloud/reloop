import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function waitFor(url, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // still starting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not start: ${url}`);
}

export default async function globalSetup() {
  const shots = process.env.SHOTS_DIR || path.join(root, "shots");
  await mkdir(shots, { recursive: true });

  const child = spawn(process.execPath, [path.join(root, "scripts", "serve-all.mjs")], {
    cwd: root,
    stdio: "inherit",
    detached: true,
  });
  child.unref();
  await writeFile(path.join(root, "e2e/.server.pid"), String(child.pid));
  await waitFor("http://127.0.0.1:8080/");
  await waitFor("http://localhost:8081/policies/opendeal.json");
  await waitFor("http://127.0.0.1:8082/policies/opendeal.json");
  await waitFor("http://localhost:8083/policies/opendeal.json");
  await waitFor("http://127.0.0.1:8084/policies/opendeal.json");
}

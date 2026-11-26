import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default async function globalTeardown() {
  const pidFile = path.join(root, "e2e/.server.pid");
  try {
    const pid = Number((await readFile(pidFile, "utf8")).trim());
    if (pid) {
      try { process.kill(-pid, "SIGTERM"); } catch { /* already gone */ }
      try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ }
    }
    await rm(pidFile, { force: true });
  } catch {
    // no pid file
  }
}

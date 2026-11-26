import { test, expect } from "@playwright/test";
import path from "node:path";

const shots = process.env.SHOTS_DIR || path.join(process.cwd(), "shots");

test("Saturday bicycle under €100 composes across three origins without a key", async ({ page }) => {
  await page.goto("http://127.0.0.1:8080/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Don't shop for products");
  await page.screenshot({ path: path.join(shots, "01-hub-landing.png"), fullPage: true });

  await page.getByRole("button", { name: "Try the Saturday bicycle" }).click();
  await expect(page.locator("#result-panel")).toBeVisible();
  await expect(page.locator("#initial-total")).toHaveText("€115");
  await expect(page.locator("#initial-flag")).toHaveText("Over budget");
  await expect(page.locator("#final-total")).toHaveText("€95");
  await expect(page.locator("#final-flag")).toContainText("Composed");
  await expect(page.locator("#package-table")).toContainText("Spoke & Salvage");
  await expect(page.locator("#package-table")).toContainText("Tuesday Workshop");
  await expect(page.locator("#package-table")).toContainText("River Runners");
  await expect(page.locator("#package-table")).toContainText("€60");
  await expect(page.locator("#package-table")).toContainText("€30");
  await expect(page.locator("#package-table")).toContainText("€5");
  await page.screenshot({ path: path.join(shots, "02-hub-composed.png"), fullPage: true });

  // Assistant / BYOK settings are present even when no key is set.
  await expect(page.locator("#assistant-status")).toContainText("does not need a key");
  await page.locator("#assistant").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(shots, "03-hub-assistant-settings.png"), fullPage: true });
});

test("shop origins publish CORS-open policies and catalogues", async ({ page, request }) => {
  const reuse = await request.get("http://localhost:8081/policies/opendeal.json");
  expect(reuse.ok()).toBeTruthy();
  expect(reuse.headers()["access-control-allow-origin"]).toBe("*");
  const policy = await reuse.json();
  expect(policy.site).toBe("Spoke & Salvage");
  expect(policy.items[0].list_price).toBe(55);

  const manifest = await request.get("http://127.0.0.1:8082/agent-manifest.json");
  expect(manifest.ok()).toBeTruthy();
  expect(manifest.headers()["access-control-allow-origin"]).toBe("*");

  await page.goto("http://localhost:8081/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Spoke & Salvage");
  await expect(page.locator("#catalog")).toContainText("Used city bike");
  await page.screenshot({ path: path.join(shots, "04-spoke-and-salvage.png"), fullPage: true });

  await page.goto("http://127.0.0.1:8082/");
  await expect(page.locator("#catalog")).toContainText("Brake service");
  await page.screenshot({ path: path.join(shots, "05-tuesday-workshop.png"), fullPage: true });

  await page.goto("http://localhost:8083/");
  await expect(page.locator("#catalog")).toContainText("Shop to workshop");
  await page.screenshot({ path: path.join(shots, "06-river-runners.png"), fullPage: true });

  await page.goto("http://127.0.0.1:8084/");
  await expect(page.locator("#catalog")).toContainText("Refurbished tourer");
  await page.screenshot({ path: path.join(shots, "07-allied-cycles.png"), fullPage: true });
});

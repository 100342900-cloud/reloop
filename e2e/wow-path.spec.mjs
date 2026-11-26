import { test, expect } from "@playwright/test";
import path from "node:path";

const shots = process.env.SHOTS_DIR || path.join(process.cwd(), "shots");

async function composeSaturday(page) {
  await page.goto("http://127.0.0.1:8080/");
  await page.getByRole("button", { name: "Try the Saturday bicycle" }).click();
  await expect(page.locator("#result-panel")).toBeVisible();
  await expect(page.locator("#initial-total")).toHaveText("€115");
  await expect(page.locator("#final-total")).toHaveText("€95");
}

test("wow path: paste Allied Cycles URL and recompose without a code change", async ({ page }) => {
  await page.goto("http://127.0.0.1:8080/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Don't shop for products");
  await page.screenshot({ path: path.join(shots, "m2-hub-landing.png"), fullPage: true });

  await page.getByRole("button", { name: "Try the Saturday bicycle" }).click();
  await expect(page.locator("#result-panel")).toBeVisible();
  await expect(page.locator("#initial-total")).toHaveText("€115");
  await expect(page.locator("#final-total")).toHaveText("€95");
  await expect(page.locator("#package-table")).toContainText("Spoke & Salvage");
  await expect(page.locator("#package-table")).toContainText("Tuesday Workshop");
  await expect(page.locator("#package-table")).toContainText("River Runners");
  await expect(page.locator("#inspector-wrap")).toBeVisible();
  await expect(page.locator("#inspector-wrap")).not.toHaveAttribute("open");
  await page.screenshot({ path: path.join(shots, "m2-hub-composed.png"), fullPage: true });

  // Deny the original reuse shop, then paste the Allied Cycles origin.
  const spoke = page.locator(".consent-card", { hasText: "Spoke & Salvage" });
  await spoke.getByRole("button", { name: "Deny" }).click();
  await page.locator("#shop-url").fill("http://127.0.0.1:8084/allied_cycles");
  await page.getByRole("button", { name: "Add shop" }).click();
  await expect(page.locator("#add-shop-status")).toContainText("Allied Cycles");
  await expect(page.locator(".consent-card", { hasText: "Allied Cycles" })).toBeVisible();

  await page.getByRole("button", { name: "Compose from allowed shops" }).click();
  await expect(page.locator("#result-panel")).toBeVisible();
  await expect(page.locator("#initial-total")).toHaveText("€95");
  await expect(page.locator("#final-total")).toHaveText("€80");
  await expect(page.locator("#package-table")).toContainText("Allied Cycles");
  await expect(page.locator("#package-table")).toContainText("River Runners");
  await expect(page.locator("#package-table")).toContainText("€75");
  await expect(page.locator("#package-table")).toContainText("€5");
  await expect(page.locator("#package-table")).not.toContainText("Spoke & Salvage");
  await expect(page.locator("#package-table")).not.toContainText("Tuesday Workshop");
  await page.screenshot({ path: path.join(shots, "m2-wow-allied.png"), fullPage: true });
});

test("in-store pickup drops cargo and finishes at €90", async ({ page }) => {
  await composeSaturday(page);
  await page.locator("#opt-collect").check();
  await expect(page.locator("#result-panel")).toBeVisible();
  await expect(page.locator("#initial-total")).toHaveText("€100");
  await expect(page.locator("#final-total")).toHaveText("€90");
  await expect(page.locator("#package-table")).toContainText("Spoke & Salvage");
  await expect(page.locator("#package-table")).toContainText("Tuesday Workshop");
  await expect(page.locator("#package-table")).not.toContainText("River Runners");
  await page.screenshot({ path: path.join(shots, "m2-collect.png"), fullPage: true });
});

test("simulated holds use selective disclosure and the receipt stores policy hashes", async ({ page }) => {
  await composeSaturday(page);

  const reuseHold = page.locator(".hold-card", { hasText: "Spoke & Salvage" });
  const repairHold = page.locator(".hold-card", { hasText: "Tuesday Workshop" });
  const cargoHold = page.locator(".hold-card", { hasText: "River Runners" });

  await expect(reuseHold).not.toContainText("Street address");
  await expect(repairHold).not.toContainText("Street address");
  await expect(cargoHold).toContainText("Street address");
  await cargoHold.locator('input[data-field="area_token"]').fill("CW-CENTRE");
  await cargoHold.locator('input[data-field="street_address"]').fill("14 Quay Walk");

  await reuseHold.getByRole("button", { name: "Simulate hold" }).click();
  await repairHold.getByRole("button", { name: "Simulate hold" }).click();
  await cargoHold.getByRole("button", { name: "Simulate hold" }).click();

  await expect(page.locator("#receipt-panel")).toBeVisible();
  await expect(page.locator("#receipt-watermark")).toContainText("SIMULATION");
  await expect(page.locator("#receipt-body")).toContainText("Spoke & Salvage");
  await expect(page.locator("#receipt-body")).toContainText("SIM-001");
  await expect(page.locator("#receipt-body")).toContainText("SIM-003");
  await expect(page.locator("#receipt-body")).toContainText("area_token");
  await expect(page.locator("#receipt-body")).toContainText("street_address");
  await expect(page.locator("#receipt-body .hash")).toHaveCount(3);

  const receipt = await page.evaluate(() => window.App.page.receipt);
  expect(receipt.kind).toBe("reloop-receipt");
  expect(receipt.simulated).toBe(true);
  expect(receipt.policies).toHaveLength(3);
  for (const policy of receipt.policies) {
    expect(policy.sha256).toMatch(/^[0-9a-f]{64}$/);
  }
  const cargo = receipt.holds.find((h) => h.role === "cargo");
  expect(cargo.disclosed_fields).toEqual([
    "item_or_service_id",
    "ready_by",
    "price",
    "area_token",
    "street_address",
  ]);
  expect(cargo.payload.street_address).toBe("14 Quay Walk");
  const reuse = receipt.holds.find((h) => h.role === "reuse");
  expect(reuse.disclosed_fields).toEqual(["item_or_service_id", "ready_by", "price"]);
  expect(reuse.payload.street_address).toBeUndefined();

  await page.screenshot({ path: path.join(shots, "m2-receipt.png"), fullPage: true });
});

test("hub layout holds together on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8080/");
  await page.getByRole("button", { name: "Try the Saturday bicycle" }).click();
  await expect(page.locator("#final-total")).toHaveText("€95");
  await page.screenshot({ path: path.join(shots, "m2-hub-mobile.png"), fullPage: true });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compose,
  saturdayNeed,
  validateNeed,
  validatePolicy,
  hashPolicy,
  DEMO_SATURDAY,
  CURRENCY,
} from "./opendeal.js";
import { REUSE, REPAIR, CARGO, ALL, ALLY } from "./fixtures.mjs";

describe("validateNeed", () => {
  it("accepts the Saturday demo need", () => {
    assert.deepEqual(validateNeed(saturdayNeed()), []);
  });

  it("rejects a missing budget", () => {
    const errors = validateNeed({ object: "bicycle", ready_by: DEMO_SATURDAY });
    assert.ok(errors.some((e) => e.includes("budget")));
  });
});

describe("validatePolicy", () => {
  it("accepts the synthetic Cedarwick policies", () => {
    for (const policy of [...ALL, ALLY]) {
      assert.deepEqual(validatePolicy(policy), [], policy.site);
    }
  });

  it("rejects min_price above list_price", () => {
    const bad = structuredClone(REUSE);
    bad.items[0].min_price = 80;
    assert.ok(validatePolicy(bad).length);
  });
});

describe("compose — Saturday bicycle under €100", () => {
  it("starts at €115 and finishes at €95 after two concession rounds", () => {
    const result = compose(saturdayNeed(100), ALL);
    assert.equal(result.status, "composed");
    assert.equal(result.initialPackage.total, 115);
    assert.equal(result.initialPackage.meets_budget, false);
    assert.equal(result.finalPackage.total, 95);
    assert.equal(result.finalPackage.currency, CURRENCY);
    assert.equal(result.finalPackage.meets_budget, true);
    assert.equal(result.finalPackage.meets_date, true);
    assert.equal(result.finalPackage.ready_by, "2027-01-09");

    const byRole = Object.fromEntries(result.finalPackage.lines.map((l) => [l.role, l]));
    assert.equal(byRole.reuse.price, 60); // 55 + spare kit
    assert.equal(byRole.repair.price, 30); // 45 - 15 when spare is included
    assert.equal(byRole.cargo.price, 5); // 15 - 10 Saturday pooled run
    assert.ok(result.finalPackage.concessions.includes("include_spare"));
    assert.ok(result.finalPackage.concessions.includes("spare_already_included"));
    assert.ok(result.finalPackage.concessions.includes("saturday_pooled_run"));
    assert.ok(result.rounds.length <= 3); // round 0 plus at most two
    assert.equal(result.rounds[0].package.total, 115);
  });

  it("is infeasible when the budget is €90", () => {
    const result = compose(saturdayNeed(90), ALL);
    assert.equal(result.status, "infeasible");
    assert.equal(result.finalPackage.total, 95);
    assert.match(result.reason, /over the budget/);
  });

  it("can drop cargo when the visitor will collect", () => {
    // List prices without cargo are 55+45=100, which already meets a €100 budget.
    // A tighter budget forces the same concessions as the happy path: 60+30=90.
    const need = { ...saturdayNeed(95), constraints: ["collect"] };
    const result = compose(need, ALL);
    assert.equal(result.status, "composed");
    assert.equal(result.finalPackage.lines.some((l) => l.role === "cargo"), false);
    assert.equal(result.finalPackage.total, 90);
  });

  it("is infeasible without a repair shop when the bike needs work", () => {
    const result = compose(saturdayNeed(100), [REUSE, CARGO]);
    assert.equal(result.status, "infeasible");
    assert.match(result.reason, /cover this need/);
  });

  it("never prices a line below min_price", () => {
    const greedy = structuredClone(REPAIR);
    greedy.concessions[0].price_delta = -20; // would be 25, below min 30
    const result = compose(saturdayNeed(100), [REUSE, greedy, CARGO]);
    const repair = result.finalPackage.lines.find((l) => l.role === "repair");
    assert.ok(repair.price >= repair.min_price);
  });

  it("composes an Allied Cycles bike that needs no repair, plus cargo", () => {
    const result = compose(saturdayNeed(100), [ALLY, CARGO]);
    assert.equal(result.status, "composed");
    assert.equal(result.finalPackage.lines.some((l) => l.role === "repair"), false);
    // list 80 + 15 = 95, or 75 + 5 = 80 if both concessions apply
    assert.ok(result.finalPackage.total <= 95);
    assert.ok(result.finalPackage.meets_budget);
  });
});

describe("hashPolicy", () => {
  it("is stable for the same policy and changes when a price changes", async () => {
    const a = await hashPolicy(REUSE);
    const b = await hashPolicy(structuredClone(REUSE));
    assert.equal(a, b);
    assert.equal(a.length, 64);
    const tweaked = structuredClone(REUSE);
    tweaked.items[0].list_price = 56;
    const c = await hashPolicy(tweaked);
    assert.notEqual(a, c);
  });
});

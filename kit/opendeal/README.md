# OpenDeal Kit

A tiny, dependency-free library that composes a multi-shop package from **published offer policies**. Prices are deterministic. A language model may explain a result; it must not invent one.

Use it in Node or in the browser as an ES module.

```js
import { compose, saturdayNeed, hashPolicy } from "opendeal-kit";

const need = saturdayNeed(100); // or your own { object, ready_by, budget, currency, constraints }
const result = compose(need, [reusePolicy, repairPolicy, cargoPolicy]);

if (result.status === "composed") {
  console.log(result.initialPackage.total, "→", result.finalPackage.total);
}

const digest = await hashPolicy(reusePolicy); // SHA-256 hex of canonical JSON
```

## What it does

1. Validates the need and every policy.
2. Builds every feasible package at **list prices** (a reuse item, any repair that item still needs, and cargo unless the need has a `collect` constraint).
3. Picks the lowest list package that meets the date and, failing that, the lowest total.
4. Explores **at most two concession rounds** from the published policies. Flag-setters run before plain discounts, so a spare kit can unlock a labour cut. A concession never takes a line below `min_price`.
5. Returns the **lowest feasible package** among those rounds. If a mid-round total goes up (a kit added before a discount lands), that intermediate package is not chosen.

The Saturday bicycle demo in RE:LOOP uses this exact engine: list €115 (55 + 45 + 15) becomes €95 (60 + 30 + 5). Collect in store drops cargo and finishes at €90. Swap in Allied Cycles (a road-ready tourer, no repair) and the list is €95, then €80 after published concessions.

## Policy shape (v1)

```json
{
  "version": 1,
  "origin": "http://localhost:8081",
  "site": "Spoke & Salvage",
  "role": "reuse",
  "currency": "EUR",
  "items": [
    {
      "id": "cedar-city-7",
      "name": "Used city bike",
      "object": "bicycle",
      "list_price": 55,
      "min_price": 50,
      "needs_repair": ["brake_service"],
      "ready_by": "2027-01-06"
    }
  ],
  "concessions": [
    {
      "id": "include_spare",
      "applies_to": "item:cedar-city-7",
      "price_delta": 5,
      "flags_set": ["includes_spare"]
    }
  ]
}
```

- `role` is `reuse`, `repair` or `cargo`. Repair and cargo policies use `services` instead of `items`.
- `applies_to` is `item:<id>`, `service:<id>` or `role:<role>`.
- `requires_flags` and `requires_need.ready_by_weekday` (0–6, Sunday–Saturday) are optional gates.
- This version only prices `EUR`.

A fuller reference, including need fields and the result object, is in [`docs/protocol.md`](./docs/protocol.md).

## Tests

```bash
npm test
```

The tests use the synthetic Cedarwick fixtures in `fixtures.mjs`. They are fictional; do not treat them as real shops or prices.

## Licence

Apache-2.0.

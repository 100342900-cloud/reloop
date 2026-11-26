# OpenDeal protocol (v1)

OpenDeal is a published-policy protocol. A shop origin hosts a JSON file, typically at `/policies/opendeal.json`, with CORS open (`Access-Control-Allow-Origin: *`). A composer (a hub page, another agent, or a script) fetches only the policies the visitor has consented to, then calls `compose(need, policies)`.

No shop has to expose a write API. Holds and bookings in RE:LOOP are simulations on top of this read-only contract.

## Need

| Field | Type | Notes |
| --- | --- | --- |
| `object` | string | What the visitor is asking for, e.g. `"bicycle"`. |
| `ready_by` | `YYYY-MM-DD` | Inclusive deadline. |
| `budget` | number | Non-negative. |
| `currency` | `"EUR"` | Required by this version when present. |
| `constraints` | string[] | `"collect"` drops cargo from the package. |
| `label` | string | Optional, for receipts and UI. |

`saturdayNeed(budget)` in the kit builds the RE:LOOP demo need (ready by 2027-01-09, demo clock 2027-01-06).

## Policy

See the README for the JSON shape. Validation rules:

- `version` must be `1`.
- `origin`, `site` and `role` are required.
- A reuse policy must list `items`; repair and cargo policies must list `services`.
- Every line has `list_price` and `min_price`, with `0 ≤ min_price ≤ list_price`.

## Composition result

```ts
{
  status: "composed" | "infeasible",
  reason?: string,
  rounds: Array<{
    round: number,                 // 0 is the list-price package
    concessions_applied: string[],
    package: Package,
    note: string
  }>,
  initialPackage?: Package,
  finalPackage?: Package
}
```

A `Package` has `total`, `currency`, `ready_by`, `meets_budget`, `meets_date`, `flags`, `concessions` (ids applied) and `lines`. Each line records `role`, `origin`, `site`, `id`, `name`, `list_price`, `min_price`, `price`, `ready_by` and `concessions`.

## Hashing

`hashPolicy(policy)` returns a SHA-256 hex digest of the policy with keys sorted recursively. The same policy always hashes the same way in Node and in the browser (Web Crypto). RE:LOOP receipts store this digest so a later reader can check which published policy was used.

## What this kit does not do

- It does not call a language model.
- It does not take payment, place a booking, or write to a shop.
- It does not send a street address. Selective disclosure is the host app's job at confirm time.
- It does not negotiate beyond the two published concession rounds.

## Versioning

This is protocol version 1, shipped as kit `0.2.0` with RE:LOOP milestone 2. New roles, currencies or concession kinds should bump `version`.

# RE:LOOP

**Don't shop for products. Shop for outcomes.**

A fictional Cedarwick demo for the [Open Agentic Web Challenge](https://cognizant-agenticweb.devpost.com/). Independent reuse, repair and cargo shops publish OpenDeal policies. The visitor's browser composes a package that no single site can sell. Prices come from a deterministic engine, not from a model inventing a discount.

This is a synthetic demo. No real shops, no real payments. Holds are simulations.

## Local origins

| Site | Origin (this machine) |
| --- | --- |
| RE:LOOP hub | http://127.0.0.1:8080/ |
| Spoke & Salvage (reuse) | http://localhost:8081/ |
| Tuesday Workshop (repair) | http://127.0.0.1:8082/ |
| River Runners (pickup) | http://localhost:8083/ |
| Allied Cycles (wildcard shop) | http://127.0.0.1:8084/ |

Different host names and ports are used so each site is a distinct origin (required for consent and CORS). Production will use separate `*.pages.dev` hosts; GitHub project pages under one user are *not* distinct origins.

## Try the demo

1. `npm run serve` and open http://127.0.0.1:8080/
2. Click **Try the Saturday bicycle**. The default shops compose a €115 list package into a €95 deal. No API key is required.
3. Deny Spoke & Salvage, paste `http://127.0.0.1:8084/allied_cycles`, and compose again. Allied Cycles publishes a road-ready tourer, so the package no longer needs a repair shop (€95 list, €80 after published concessions).
4. Switch to **I’ll collect it in store** to drop cargo (€90).
5. Simulate a hold on each shop. Only the cargo shop may receive an area token or street address, and only at confirm time. Download the receipt to see SHA-256 hashes of the policies that were used.

The optional assistant (official nsDeploy runtime) uses bring-your-own-key. This repo does not ship or request keys.

## OpenDeal Kit

The composer is a reusable, Apache-2.0 library in [`kit/opendeal/`](./kit/opendeal/). It works in Node and in the browser. See that [README](./kit/opendeal/README.md) and the [protocol reference](./kit/opendeal/docs/protocol.md).

## Commands

```bash
npm test                 # OpenDeal unit tests
npm run build:networks   # official build_network.mjs --check for every site
npm run serve            # five origins on the ports above
npx playwright test      # happy path, wow path, consent, holds, receipts
```

## Layout

```
kit/opendeal/     OpenDeal Kit (engine, fixtures, docs, unit tests)
sites/hub|reuse|repair|cargo|ally/   static origins
vendor/           official runtime and validator (Apache-2.0, from cognizant-ai-labs/agentic-web)
scripts/          build, copy, and local multi-origin server
e2e/              Playwright tests
docs/             pointers into the kit
```

## Licence

Apache-2.0. The official runtime and scripts under `vendor/` remain under their upstream Apache-2.0 licence; see `vendor/NOTICE`.

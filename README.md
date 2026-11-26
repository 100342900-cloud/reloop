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

## Commands

```bash
npm test                 # OpenDeal unit tests
npm run build:networks   # official build_network.mjs --check for every site
npm run serve            # five origins on the ports above
npx playwright test      # happy path plus CORS/catalogue checks
```

The Saturday bicycle button works **without an API key**. The optional assistant (official nsDeploy runtime) uses bring-your-own-key, including Connect with OpenRouter or Otari when you have a key. This repo does not ship or request keys.

## Layout

```
kit/opendeal/     OpenDeal engine, fixtures and unit tests
sites/hub|reuse|repair|cargo|ally/   static origins
vendor/           official runtime and validator (Apache-2.0, from cognizant-ai-labs/agentic-web)
scripts/          build, copy, and local multi-origin server
e2e/              Playwright tests
```

## Licence

Apache-2.0. The official runtime and scripts under `vendor/` remain under their upstream Apache-2.0 licence; see `vendor/NOTICE`.

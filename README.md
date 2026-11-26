# RE:LOOP

**Don't shop for products. Shop for outcomes.**

A fictional Cedarwick demo for the [Open Agentic Web Challenge](https://cognizant-agenticweb.devpost.com/). Ask for an outcome — *a working bicycle by Saturday, under €100* — and your browser composes it across independent reuse, repair and cargo shops. Each shop publishes an OpenDeal policy; a deterministic engine computes the price. A model may explain a result, but it never invents one.

This is a synthetic demo: no real shops, no real payments. Every hold is a labeled simulation.

## What a judge should notice

- **Outcome, not SKU.** No single shop sells "a working bike by Saturday." The browser composes reuse, repair and pickup into one package.
- **Deterministic, published prices.** Totals come from each shop's OpenDeal policy, not from a model inventing a discount.
- **Real consent across five origins.** Nothing is fetched until you allow each shop, one origin at a time. Your address stays off the wire until a cargo confirm.
- **Swap a shop at runtime.** Deny one, paste another, recompose — no code change.

## Live demo

The production demo will be hosted as **five separate origins** (one Cloudflare Pages project per site, free `*.pages.dev` hosts). GitHub Pages under a single account share one origin, so they cannot stand in for the shops.

| Site | URL |
| --- | --- |
| RE:LOOP hub | _coming soon_ |
| Spoke & Salvage | _coming soon_ |
| Tuesday Workshop | _coming soon_ |
| River Runners | _coming soon_ |
| Allied Cycles | _coming soon_ |

Until those URLs are live, run the demo locally as below.

## Try it locally

```bash
npm test                 # OpenDeal unit tests
npm run serve            # five origins on loopback
```

Open http://127.0.0.1:8080/ and click **Try the Saturday bicycle**. No API key is required for this path.

1. The three default shops compose a €115 list package down to a €95 deal.
2. Deny Spoke & Salvage, paste `http://127.0.0.1:8084/allied_cycles`, and compose again. Allied Cycles publishes a road-ready tourer, so the package no longer needs a repair shop (€95 list, €80 after published concessions).
3. Switch to **I’ll collect it in store** to drop the cargo leg (€90).
4. Simulate a hold on each shop. Only the cargo shop may receive an area token or street address, and only at confirm time. Download the receipt to see the SHA-256 hash of every policy that was used.

| Site | Origin (this machine) |
| --- | --- |
| RE:LOOP hub | http://127.0.0.1:8080/ |
| Spoke & Salvage (reuse) | http://localhost:8081/ |
| Tuesday Workshop (repair) | http://127.0.0.1:8082/ |
| River Runners (pickup) | http://localhost:8083/ |
| Allied Cycles (wildcard shop) | http://127.0.0.1:8084/ |

Different host names and ports are used so each site is a distinct origin (required for consent and CORS).

The optional assistant (official nsDeploy runtime) uses bring-your-own-key. This repository does not ship or request keys.

```bash
npm run build:networks   # official build_network.mjs --check for every site
npx playwright test      # happy path, wow path, consent, holds, receipts
```

Playwright writes screenshots to `shots/` (gitignored). Override the directory with `SHOTS_DIR`.

## MVP Profile conformance

Each origin is a static, self-contained agentified website built with the official [agentify-website](https://github.com/cognizant-ai-labs/agentic-web) tooling (MVP Profile 0.2/0.3):

- Public `agent-manifest.json`, compiled `*.network.json`, `links.json`, `.well-known/nsdeploy.json` and a same-origin action bridge.
- The official browser runtime, vendored under `vendor/` and copied into each site. Agents run in the visitor's browser on the visitor's model and key (BYOK). The Saturday bicycle demo does not need a key.
- Networks are checked with official `build_network.mjs` and `check_partner.mjs`.
- Shop offer policies live at `/policies/opendeal.json` and are CORS-open. Composition is a **read** of published policies after per-origin consent; shop bridges share no website tools, so the demo does not depend on a cross-site write transport.
- Partner URLs are loopback during local development. Production will switch them to `https` origins.

## OpenDeal Kit

The composer is a reusable, Apache-2.0 library in [`kit/opendeal/`](./kit/opendeal/). It works in Node and in the browser. A language model may explain a result; it must not invent a price.

See the kit [README](./kit/opendeal/README.md) and the [protocol reference](./kit/opendeal/docs/protocol.md).

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

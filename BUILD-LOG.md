# RE:LOOP build log

## Status (26 November 2026, Europe/Madrid)

Milestone 2 is **working locally**.

- Wow path: deny Spoke & Salvage, paste `http://127.0.0.1:8084/allied_cycles` (or the Allied origin), and recompose with no code changes. The new shop is discovered from its published `/policies/opendeal.json`. Allied's road-ready tourer needs no repair, so the package is Allied Cycles + River Runners: list €95 (80 + 15) → €80 (75 + 5) after published concessions.
- Consent and deny are per origin in the hub UI. In-store pickup drops cargo and finishes at €90 (60 + 30).
- Simulated holds, with selective disclosure: every shop sees item id, ready-by and price; only the cargo shop may receive an area token or street address, and only at confirm time. Draft fields survive when another card is confirmed first.
- Receipts are `reloop-receipt` v1: simulation watermark, consent log, SHA-256 hashes of each fetched policy, hold payloads and disclosed fields. Downloadable as JSON.
- OpenDeal Kit is a reusable Apache-2.0 library in `kit/opendeal/` (README, protocol docs, `package.json`, fixtures, 11 unit tests). It runs in Node and in the browser. The composer now explores at most two concession rounds even when the list package already meets the budget, and keeps the lowest feasible package. That is why collect at a €100 budget still reaches €90, and why Allied + cargo reaches €80, without inventing prices.
- Design pass on the hub: editorial landing (hero, three-step explainer), then a guided Need → Consent → Package → Confirm → Receipt flow. The hero steps aside once the demo starts. Shop cards, a visual package board, and animated negotiation rounds (DOM values are written immediately; `prefers-reduced-motion` is honoured). Technical inspector and the official BYOK assistant are collapsed by default. Mobile layout and a skip link are in place.
- Official `build_network.mjs`: all five sites exit 0. Expected warning only: the hub lists Allied Cycles in `allowed_peers` for the URL-swap path, but no agent calls it yet.
- Official `check_partner.mjs`: each default shop, and Allied Cycles, can be called from the hub; the hub can be called from a shop. OK.
- OpenDeal Kit unit tests: **11/11 passed**.
- Playwright e2e: **6/6 passed** (original happy path and CORS/catalogues, plus wow path, collect, hashed receipt / selective disclosure, and a 390px layout check).
- Screenshots: `shots/` (`01`–`07` from the happy path; `m2-*` from milestone 2).
- No paid APIs, no sign-ups, no live model calls (composer is deterministic; assistant is BYOK and untested against a real key).

## Decisions

- Use the official agentify-website runtime and validator, not a custom runtime.
- Happy path and wow path do not need an LLM. The OpenDeal engine on the hub fetches consented `/policies/opendeal.json` files over CORS and composes them in the browser. Adding a shop is generic: any origin that publishes that file can be pasted in.
- Official `serve_site.mjs` only CORS-opens spec artefacts. Local serving uses `scripts/serve-site.mjs`, a copy that also opens `/policies/opendeal.json`. Cloudflare `_headers` already includes `/policies/*` for later deploys.
- Local hosts: `127.0.0.1` and `localhost` with distinct ports (origins include the port). Avoided `::1` to keep Playwright simple. Official HTTP loopback allow-list still covers these hosts.
- Shop action bridges share no website tools. Composition reads published policy data, which stays inside the MVP (no cross-site write transport). Holds are simulations on the hub.
- Demo clock is frozen at Wednesday 2027-01-06; Saturday is 2027-01-09.

## Next steps

1. Once a free Cloudflare account is ready: deploy each `sites/*` folder to its own `*.pages.dev` origin and switch partner URLs to HTTPS.
2. Optional: try OpenRouter `:free` / Otari only with a visitor-supplied key; WebLLM remains a stretch goal.
3. Re-check `docs/agentic_websites.md` before submission.
4. Devpost registration and submission only after an explicit go-ahead (deadline 11 January 2027, 17:00 Europe/Madrid).

## How to run this milestone

```bash
cd path/to/reloop  # repository root
npm test
npm run serve    # then open http://127.0.0.1:8080/ and click “Try the Saturday bicycle”
npx playwright test
```

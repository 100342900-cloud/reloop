# RE:LOOP build log

## Status (26 November 2026, Europe/Madrid)

Milestone 1 skeleton is **working locally**.

- Five static origins (hub, reuse, repair, cargo, ally) serve on separate loopback hosts/ports.
- Agent manifests and networks were built with the official `build_network.mjs` (MVP 0.2/0.3 skill checker). All five exited 0. One expected warning: the hub lists Allied Cycles in `allowed_peers` for a later URL-swap path, but no agent calls it yet.
- Official `check_partner.mjs`: each default shop can be called from the hub; the hub can be called from a shop. OK.
- OpenDeal Kit unit tests: **11/11 passed**.
- Playwright e2e: **2/2 passed**, including the no-key happy path “bike ready by Saturday under €100” (€115 list → €95 after two concession rounds), CORS on policy files, and catalogues on all four shop origins.
- Screenshots: `shots/`.
- No paid APIs, no sign-ups, no live model calls (composer is deterministic; assistant is BYOK and untested against a real key).

## Decisions

- Use the official agentify-website runtime and validator, not a custom runtime.
- Happy path does not need an LLM. The OpenDeal engine on the hub fetches consented `/policies/opendeal.json` files over CORS and composes them in the browser.
- Official `serve_site.mjs` only CORS-opens spec artefacts. Local serving uses `scripts/serve-site.mjs`, a copy that also opens `/policies/opendeal.json`. Cloudflare `_headers` already includes `/policies/*` for later deploys.
- Local hosts: `127.0.0.1` and `localhost` with distinct ports (origins include the port). Avoided `::1` to keep Playwright simple. Official HTTP loopback allow-list still covers these hosts.
- Shop action bridges share no website tools yet. Composition reads published policy data, which stays inside the MVP (no cross-site write transport).
- Demo clock is frozen at Wednesday 2027-01-06; Saturday is 2027-01-09.

## Next steps

1. URL-swap wow path: paste Allied Cycles’ public network URL, consent, recompose without code changes.
2. Deny-consent and collect-only paths in the UI (engine already supports collect).
3. Simulation holds on each shop origin, with selective disclosure (no street address at quote time).
4. Exportable receipt UI polish; OpenDeal Kit standalone README.
5. Once a free Cloudflare account is ready: deploy each `sites/*` folder to its own `*.pages.dev` origin and switch partner URLs to HTTPS.
6. Optional: try OpenRouter `:free` / Otari only with a visitor-supplied key; WebLLM remains a stretch goal.
7. Re-check `docs/agentic_websites.md` before submission.

## How to run this milestone

```bash
cd path/to/reloop  # repository root
npm test
npm run serve    # then open http://127.0.0.1:8080/ and click “Try the Saturday bicycle”
```

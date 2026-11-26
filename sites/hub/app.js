/**
 * RE:LOOP hub page state and OpenDeal composition (no model required).
 */
import { compose, saturdayNeed, hashPolicy, DEMO_CLOCK, DEMO_SATURDAY } from "./opendeal.js";

const DEFAULT_PEERS = [
  {
    id: "reuse",
    name: "Spoke & Salvage",
    role: "reuse",
    origin: "http://localhost:8081",
    policyUrl: "http://localhost:8081/policies/opendeal.json",
    siteUrl: "http://localhost:8081/",
    purpose: "Read the public catalogue and OpenDeal offer policy.",
  },
  {
    id: "repair",
    name: "Tuesday Workshop",
    role: "repair",
    origin: "http://127.0.0.1:8082",
    policyUrl: "http://127.0.0.1:8082/policies/opendeal.json",
    siteUrl: "http://127.0.0.1:8082/",
    purpose: "Read the public repair services and OpenDeal offer policy.",
  },
  {
    id: "cargo",
    name: "River Runners",
    role: "cargo",
    origin: "http://localhost:8083",
    policyUrl: "http://localhost:8083/policies/opendeal.json",
    siteUrl: "http://localhost:8083/",
    purpose: "Read the public pickup rates and OpenDeal offer policy.",
  },
];

class Page {
  constructor() {
    this.version = 1;
    this.need = null;
    this.consent = {};
    this.policies = [];
    this.result = null;
    this.error = null;
    this.receipt = null;
  }

  getState() {
    return {
      site: "RE:LOOP",
      fictional: true,
      demo_clock: DEMO_CLOCK,
      demo_saturday: DEMO_SATURDAY,
      version: this.version,
      need: this.need,
      consented_origins: DEFAULT_PEERS.filter((p) => this.consent[p.origin]).map((p) => ({
        name: p.name,
        origin: p.origin,
        role: p.role,
        siteUrl: p.siteUrl,
      })),
      composition: this.result,
      receipt: this.receipt,
      cannot: [
        "Take payment",
        "Place a real booking",
        "Share a street address with a shop during quoting",
      ],
    };
  }

  setSaturdayNeed() {
    this.need = saturdayNeed(100);
    this.result = null;
    this.receipt = null;
    this.error = null;
    this.version += 1;
    return this.getState();
  }

  setConsent(origin, granted) {
    this.consent[origin] = Boolean(granted);
    this.version += 1;
    return this.getState();
  }

  consentedPeers() {
    return DEFAULT_PEERS.filter((p) => this.consent[p.origin]);
  }

  async composeFromConsent() {
    this.error = null;
    if (!this.need) {
      this.error = "Set a need first.";
      return { ok: false, reason: this.error };
    }
    const peers = this.consentedPeers();
    if (!peers.length) {
      this.error = "Consent to at least one shop origin first.";
      return { ok: false, reason: this.error };
    }
    const policies = [];
    const hashes = [];
    for (const peer of peers) {
      const response = await fetch(peer.policyUrl, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        this.error = `Could not read ${peer.name} policy (${response.status}).`;
        return { ok: false, reason: this.error };
      }
      const policy = await response.json();
      policies.push(policy);
      hashes.push({ site: peer.name, origin: peer.origin, sha256: await hashPolicy(policy) });
    }
    this.policies = policies;
    this.result = compose(this.need, policies);
    this.receipt = {
      kind: "composition",
      simulated: true,
      demo_clock: DEMO_CLOCK,
      need: this.need,
      origins: hashes,
      status: this.result.status,
      total: this.result.finalPackage?.total ?? null,
      currency: "EUR",
    };
    this.version += 1;
    return { ok: this.result.status === "composed", result: this.result, receipt: this.receipt };
  }
}

export const App = {
  page: new Page(),
  peers: DEFAULT_PEERS,
  DEMO_CLOCK,
  DEMO_SATURDAY,
};

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
    networkUrl: "http://localhost:8081/spoke_and_salvage",
    purpose: "Read the public catalogue and OpenDeal offer policy.",
    added: false,
  },
  {
    id: "repair",
    name: "Tuesday Workshop",
    role: "repair",
    origin: "http://127.0.0.1:8082",
    policyUrl: "http://127.0.0.1:8082/policies/opendeal.json",
    siteUrl: "http://127.0.0.1:8082/",
    networkUrl: "http://127.0.0.1:8082/tuesday_workshop",
    purpose: "Read the public repair services and OpenDeal offer policy.",
    added: false,
  },
  {
    id: "cargo",
    name: "River Runners",
    role: "cargo",
    origin: "http://localhost:8083",
    policyUrl: "http://localhost:8083/policies/opendeal.json",
    siteUrl: "http://localhost:8083/",
    networkUrl: "http://localhost:8083/river_runners",
    purpose: "Read the public pickup rates and OpenDeal offer policy.",
    added: false,
  },
];

/** Turn a pasted origin, network URL or policy URL into a policy URL. */
export function resolvePolicyUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) throw new Error("Paste a shop URL first.");
  const url = new URL(trimmed);
  return { origin: url.origin, policyUrl: `${url.origin}/policies/opendeal.json`, siteUrl: `${url.origin}/` };
}

class Page {
  constructor() {
    this.version = 1;
    this.need = null;
    this.consent = {};
    this.addedPeers = [];
    this.policies = [];
    this.result = null;
    this.error = null;
    this.receipt = null;
    this.holds = [];
    this.collect = false;
    this.disclosure = { area_token: "", street_address: "" };
  }

  allPeers() {
    return [...DEFAULT_PEERS, ...this.addedPeers];
  }

  getState() {
    return {
      site: "RE:LOOP",
      fictional: true,
      demo_clock: DEMO_CLOCK,
      demo_saturday: DEMO_SATURDAY,
      version: this.version,
      need: this.need,
      collect: this.collect,
      consented_origins: this.allPeers().filter((p) => this.consent[p.origin]).map((p) => ({
        name: p.name,
        origin: p.origin,
        role: p.role,
        siteUrl: p.siteUrl,
        added: Boolean(p.added),
      })),
      composition: this.result,
      receipt: this.receipt,
      holds: this.holds,
      cannot: [
        "Take payment",
        "Place a real booking",
        "Share a street address with a shop during quoting",
      ],
    };
  }

  setSaturdayNeed() {
    this.need = saturdayNeed(100);
    this.need.constraints = this.collect ? ["collect"] : [];
    this.result = null;
    this.receipt = null;
    this.holds = [];
    this.error = null;
    this.version += 1;
    return this.getState();
  }

  setCollect(collect) {
    this.collect = Boolean(collect);
    if (this.need) {
      this.need = { ...this.need, constraints: this.collect ? ["collect"] : [] };
    }
    this.result = null;
    this.receipt = null;
    this.holds = [];
    this.version += 1;
    return this.getState();
  }

  setConsent(origin, granted) {
    this.consent[origin] = Boolean(granted);
    this.result = null;
    this.receipt = null;
    this.holds = [];
    this.version += 1;
    return this.getState();
  }

  consentedPeers() {
    return this.allPeers().filter((p) => this.consent[p.origin]);
  }

  async addShopByUrl(raw) {
    const { origin, policyUrl, siteUrl } = resolvePolicyUrl(raw);
    const existing = this.allPeers().find((p) => p.origin === origin);
    if (existing) {
      this.setConsent(origin, true);
      return { ok: true, peer: existing, already: true };
    }
    const response = await fetch(policyUrl, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`No OpenDeal policy at ${policyUrl} (${response.status}).`);
    }
    const policy = await response.json();
    if (!policy || !policy.role || !policy.site) {
      throw new Error("That URL did not return a valid OpenDeal policy.");
    }
    let brand = policy.site;
    try {
      const manifest = await fetch(`${origin}/agent-manifest.json`, { headers: { Accept: "application/json" } });
      if (manifest.ok) {
        const data = await manifest.json();
        if (data.brand) brand = String(data.brand).replace(/ Assistant$/, "");
      }
    } catch {
      // Policy is enough; a missing manifest is not fatal.
    }
    const peer = {
      id: `added-${origin}`,
      name: brand,
      role: policy.role,
      origin,
      policyUrl,
      siteUrl,
      networkUrl: raw.trim(),
      purpose: "Read the public OpenDeal offer policy at this origin.",
      added: true,
    };
    this.addedPeers.push(peer);
    this.consent[origin] = true;
    this.result = null;
    this.receipt = null;
    this.holds = [];
    this.version += 1;
    return { ok: true, peer, already: false };
  }

  async composeFromConsent() {
    this.error = null;
    this.holds = [];
    if (!this.need) {
      this.error = "Set a need first.";
      return { ok: false, reason: this.error };
    }
    const peers = this.consentedPeers();
    if (!peers.length) {
      this.error = "Allow at least one shop origin first.";
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
      hashes.push({
        site: policy.site || peer.name,
        origin: peer.origin,
        role: policy.role || peer.role,
        sha256: await hashPolicy(policy),
      });
    }
    this.policies = policies;
    this.result = compose(this.need, policies);
    this.receipt = this.buildReceipt(hashes);
    this.version += 1;
    return { ok: this.result.status === "composed", result: this.result, receipt: this.receipt };
  }

  buildReceipt(hashes) {
    const consent = this.allPeers().map((p) => ({
      site: p.name,
      origin: p.origin,
      role: p.role,
      granted: Boolean(this.consent[p.origin]),
      added: Boolean(p.added),
      purpose: p.purpose,
    }));
    return {
      kind: "reloop-receipt",
      version: 1,
      simulated: true,
      watermark: "SIMULATION — fictional Cedarwick, no real booking or payment",
      issued_at: new Date().toISOString(),
      demo_clock: DEMO_CLOCK,
      need: this.need,
      consent,
      policies: hashes,
      status: this.result.status,
      reason: this.result.reason || null,
      total: this.result.finalPackage?.total ?? null,
      currency: "EUR",
      initial_total: this.result.initialPackage?.total ?? null,
      concessions: this.result.finalPackage?.concessions || [],
      package: this.result.finalPackage,
      rounds: (this.result.rounds || []).map((r) => ({
        round: r.round,
        concessions_applied: r.concessions_applied,
        total: r.package?.total,
        note: r.note,
      })),
      holds: this.holds,
      disclosure: {
        at_quote: ["object", "ready_by", "budget", "item_class"],
        never_at_quote: ["street_address", "area_token"],
        at_confirm: this.holds.map((h) => ({
          origin: h.origin,
          fields: h.disclosed_fields,
        })),
      },
    };
  }

  holdTargets() {
    const lines = this.result?.finalPackage?.lines || [];
    return lines.map((line) => ({
      origin: line.origin,
      site: line.site,
      role: line.role,
      id: line.id,
      name: line.name,
      price: line.price,
      quote_fields: ["item_or_service_id", "ready_by", "price"],
      may_receive_address: line.role === "cargo",
    }));
  }

  simulateHold(origin, extra = {}) {
    const target = this.holdTargets().find((t) => t.origin === origin);
    if (!target) {
      return { ok: false, reason: "That shop is not in the current package." };
    }
    if (this.holds.some((h) => h.origin === origin)) {
      return { ok: true, already: true, hold: this.holds.find((h) => h.origin === origin) };
    }
    const disclosed = ["item_or_service_id", "ready_by", "price"];
    const payload = {
      item_or_service_id: target.id,
      ready_by: this.need?.ready_by,
      price: target.price,
    };
    if (target.may_receive_address) {
      const area = String(extra.area_token || "").trim();
      const street = String(extra.street_address || "").trim();
      if (area) {
        disclosed.push("area_token");
        payload.area_token = area;
      }
      if (street) {
        disclosed.push("street_address");
        payload.street_address = street;
      }
    }
    const hold = {
      id: `SIM-${String(this.holds.length + 1).padStart(3, "0")}`,
      simulated: true,
      origin,
      site: target.site,
      role: target.role,
      target_id: target.id,
      disclosed_fields: disclosed,
      payload,
      note: "Simulation only. Nothing was reserved at a real shop.",
    };
    this.holds.push(hold);
    if (this.receipt) {
      this.receipt = this.buildReceipt(this.receipt.policies);
    }
    this.version += 1;
    return { ok: true, hold };
  }

  allHoldsDone() {
    const targets = this.holdTargets();
    return targets.length > 0 && targets.every((t) => this.holds.some((h) => h.origin === t.origin));
  }
}

export const App = {
  page: new Page(),
  defaultPeers: DEFAULT_PEERS,
  get peers() {
    return App.page.allPeers();
  },
  DEMO_CLOCK,
  DEMO_SATURDAY,
};

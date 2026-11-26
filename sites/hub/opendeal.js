/**
 * OpenDeal Kit — deterministic offer and concession engine.
 *
 * Prices never come from a model. A caller passes a need and the published
 * policies of consented shops. The engine composes a package at list prices,
 * then applies at most two concession rounds, never going below each line's
 * min_price.
 *
 * Works in Node and in the browser (ES module).
 */

export const DEMO_CLOCK = "2027-01-06"; // fictional Wednesday
export const DEMO_SATURDAY = "2027-01-09";
export const MAX_ROUNDS = 2;
export const CURRENCY = "EUR";
export const VERSION = 1;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayName(isoDate) {
  return WEEKDAYS[weekdayNumber(isoDate)];
}

export function weekdayNumber(isoDate) {
  // Parse as UTC date-only to avoid timezone shifts.
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function dateLte(a, b) {
  return a <= b;
}

export function validateNeed(need) {
  const errors = [];
  if (!need || typeof need !== "object") {
    return ["Need must be an object."];
  }
  if (!need.object || typeof need.object !== "string") {
    errors.push("Need.object is required.");
  }
  if (!need.ready_by || !/^\d{4}-\d{2}-\d{2}$/.test(need.ready_by)) {
    errors.push("Need.ready_by must be an ISO date (YYYY-MM-DD).");
  }
  if (typeof need.budget !== "number" || !Number.isFinite(need.budget) || need.budget < 0) {
    errors.push("Need.budget must be a non-negative number.");
  }
  if (need.currency && need.currency !== CURRENCY) {
    errors.push(`Need.currency must be ${CURRENCY} in this version.`);
  }
  return errors;
}

export function validatePolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== "object") {
    return ["Policy must be an object."];
  }
  if (policy.version !== VERSION) {
    errors.push("Policy.version must be 1.");
  }
  if (!policy.origin || !policy.site || !policy.role) {
    errors.push("Policy.origin, policy.site and policy.role are required.");
  }
  if (!["reuse", "repair", "cargo"].includes(policy.role)) {
    errors.push("Policy.role must be reuse, repair or cargo.");
  }
  if (policy.currency && policy.currency !== CURRENCY) {
    errors.push(`Policy.currency must be ${CURRENCY} in this version.`);
  }
  const items = policy.items || [];
  const services = policy.services || [];
  if (policy.role === "reuse" && !items.length) {
    errors.push("A reuse policy must list items.");
  }
  if ((policy.role === "repair" || policy.role === "cargo") && !services.length) {
    errors.push("A repair or cargo policy must list services.");
  }
  for (const line of [...items, ...services]) {
    if (typeof line.list_price !== "number" || typeof line.min_price !== "number") {
      errors.push(`${line.id || "a line"} needs list_price and min_price.`);
      continue;
    }
    if (line.min_price > line.list_price) {
      errors.push(`${line.id}: min_price cannot exceed list_price.`);
    }
    if (line.min_price < 0 || line.list_price < 0) {
      errors.push(`${line.id}: prices cannot be negative.`);
    }
  }
  return errors;
}

/**
 * Build a first-round package at list prices, or null if the policies cannot
 * cover the need (wrong object, missing repair, and so on).
 */
export function initialPackage(need, policies) {
  const reusePolicies = policies.filter((p) => p.role === "reuse");
  const repairPolicies = policies.filter((p) => p.role === "repair");
  const cargoPolicies = policies.filter((p) => p.role === "cargo");
  const collectOnly = Array.isArray(need.constraints) && need.constraints.includes("collect");

  const candidates = [];
  for (const shop of reusePolicies) {
    for (const item of shop.items || []) {
      if (item.object !== need.object) continue;
      const needed = item.needs_repair || [];
      let repair = null;
      if (needed.length) {
        repair = findRepair(repairPolicies, needed);
        if (!repair) continue;
      }
      let cargo = null;
      if (!collectOnly) {
        cargo = findCargo(cargoPolicies);
        if (!cargo) continue;
      }
      candidates.push(packageFrom(need, shop, item, repair, cargo, []));
    }
  }
  if (!candidates.length) return null;
  candidates.sort(comparePackages);
  return candidates[0];
}

function findRepair(repairPolicies, neededIds) {
  for (const shop of repairPolicies) {
    for (const service of shop.services || []) {
      const fixes = service.fixes || [];
      if (neededIds.every((id) => fixes.includes(id))) {
        return { shop, service };
      }
    }
  }
  return null;
}

function findCargo(cargoPolicies) {
  for (const shop of cargoPolicies) {
    for (const service of shop.services || []) {
      return { shop, service };
    }
  }
  return null;
}

function packageFrom(need, shop, item, repair, cargo, concessions) {
  const flags = new Set();
  const lines = [];

  const itemLine = lineFrom("reuse", shop, item, 0, []);
  lines.push(itemLine);

  if (repair) {
    lines.push(lineFrom("repair", repair.shop, repair.service, 0, []));
  }
  if (cargo) {
    lines.push(lineFrom("cargo", cargo.shop, cargo.service, 0, []));
  }

  applyConcessionList(lines, flags, concessions, need, shop, item, repair, cargo);

  const total = lines.reduce((sum, line) => sum + line.price, 0);
  const readyBy = lines
    .map((line) => line.ready_by)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;

  return {
    currency: CURRENCY,
    total,
    ready_by: readyBy,
    meets_budget: total <= need.budget,
    meets_date: !readyBy || dateLte(readyBy, need.ready_by),
    flags: [...flags],
    concessions: concessions.map((c) => c.id),
    lines,
  };
}

function lineFrom(role, shop, source, delta, applied) {
  const price = source.list_price + delta;
  if (price < source.min_price) {
    throw new Error(`Refusing a price below min_price for ${source.id}.`);
  }
  return {
    role,
    origin: shop.origin,
    site: shop.site,
    id: source.id,
    name: source.name,
    list_price: source.list_price,
    min_price: source.min_price,
    price,
    ready_by: source.ready_by || null,
    concessions: applied,
  };
}

function applyConcessionList(lines, flags, concessions, need, shop, item, repair, cargo) {
  const context = { need, shop, item, repair, cargo, flags };
  for (const concession of concessions) {
    if (!concessionApplies(concession, context, lines)) continue;
    const line = lines.find((l) => lineMatches(l, concession.applies_to));
    if (!line) continue;
    const next = line.price + concession.price_delta;
    if (next < line.min_price) continue;
    line.price = next;
    line.concessions = [...line.concessions, concession.id];
    for (const flag of concession.flags_set || []) {
      flags.add(flag);
    }
  }
}

function lineMatches(line, appliesTo) {
  if (!appliesTo) return false;
  const [kind, id] = appliesTo.split(":");
  if (kind === "item" || kind === "service") return line.id === id;
  if (kind === "role") return line.role === id;
  return false;
}

function concessionApplies(concession, context, lines) {
  for (const flag of concession.requires_flags || []) {
    if (!context.flags.has(flag)) return false;
  }
  const needReq = concession.requires_need || {};
  if (needReq.ready_by_weekday !== undefined) {
    if (weekdayNumber(context.need.ready_by) !== needReq.ready_by_weekday) {
      return false;
    }
  }
  if (concession.applies_to && !lines.some((l) => lineMatches(l, concession.applies_to))) {
    return false;
  }
  return true;
}

function comparePackages(a, b) {
  if (a.meets_budget !== b.meets_budget) return a.meets_budget ? -1 : 1;
  if (a.meets_date !== b.meets_date) return a.meets_date ? -1 : 1;
  if (a.total !== b.total) return a.total - b.total;
  return 0;
}

/**
 * List concessions from the given policies that can still be applied to pkg.
 */
export function applicableConcessions(need, policies, pkg) {
  const flags = new Set(pkg.flags || []);
  const found = [];
  for (const policy of policies) {
    for (const concession of policy.concessions || []) {
      if ((pkg.concessions || []).includes(concession.id)) continue;
      const dummyContext = contextFromPackage(need, policies, pkg, flags);
      if (concessionApplies(concession, dummyContext, pkg.lines)) {
        // Also skip if it would break min_price.
        const line = pkg.lines.find((l) => lineMatches(l, concession.applies_to));
        if (!line) continue;
        if (line.price + concession.price_delta < line.min_price) continue;
        found.push({ ...concession, origin: policy.origin, site: policy.site });
      }
    }
  }
  return found;
}

function contextFromPackage(need, policies, pkg, flags) {
  const reuseLine = pkg.lines.find((l) => l.role === "reuse");
  const repairLine = pkg.lines.find((l) => l.role === "repair");
  const cargoLine = pkg.lines.find((l) => l.role === "cargo");
  const shop = policies.find((p) => p.origin === reuseLine?.origin);
  const item = shop?.items?.find((i) => i.id === reuseLine?.id);
  const repairShop = policies.find((p) => p.origin === repairLine?.origin);
  const repair = repairLine
    ? { shop: repairShop, service: repairShop?.services?.find((s) => s.id === repairLine.id) }
    : null;
  const cargoShop = policies.find((p) => p.origin === cargoLine?.origin);
  const cargo = cargoLine
    ? { shop: cargoShop, service: cargoShop?.services?.find((s) => s.id === cargoLine.id) }
    : null;
  return { need, shop, item, repair, cargo, flags };
}

function rebuildWith(need, policies, pkg, concessionIds) {
  const reuseLine = pkg.lines.find((l) => l.role === "reuse");
  const shop = policies.find((p) => p.origin === reuseLine.origin);
  const item = shop.items.find((i) => i.id === reuseLine.id);
  const repairLine = pkg.lines.find((l) => l.role === "repair");
  const repair = repairLine
    ? {
        shop: policies.find((p) => p.origin === repairLine.origin),
        service: policies
          .find((p) => p.origin === repairLine.origin)
          .services.find((s) => s.id === repairLine.id),
      }
    : null;
  const cargoLine = pkg.lines.find((l) => l.role === "cargo");
  const cargo = cargoLine
    ? {
        shop: policies.find((p) => p.origin === cargoLine.origin),
        service: policies
          .find((p) => p.origin === cargoLine.origin)
          .services.find((s) => s.id === cargoLine.id),
      }
    : null;
  const byId = new Map();
  for (const policy of policies) {
    for (const concession of policy.concessions || []) {
      byId.set(concession.id, concession);
    }
  }
  const selected = concessionIds.map((id) => byId.get(id)).filter(Boolean);
  return packageFrom(need, shop, item, repair, cargo, selected);
}

/**
 * Compose a need against consented policies.
 *
 * @returns {{
 *   status: "composed" | "infeasible",
 *   reason?: string,
 *   rounds: Array,
 *   initialPackage?: object,
 *   finalPackage?: object
 * }}
 */
export function compose(need, policies) {
  const needErrors = validateNeed(need);
  if (needErrors.length) {
    return { status: "infeasible", reason: needErrors.join(" "), rounds: [] };
  }
  const policyErrors = [];
  for (const policy of policies) {
    policyErrors.push(...validatePolicy(policy).map((e) => `${policy.site || "?"}: ${e}`));
  }
  if (policyErrors.length) {
    return { status: "infeasible", reason: policyErrors.join(" "), rounds: [] };
  }
  if (!policies.length) {
    return {
      status: "infeasible",
      reason: "No shop policies were provided. Consent to at least one origin.",
      rounds: [],
    };
  }

  const initial = initialPackage(need, policies);
  if (!initial) {
    return {
      status: "infeasible",
      reason: "No combination of the consented shops can cover this need.",
      rounds: [],
    };
  }

  const rounds = [
    {
      round: 0,
      concessions_applied: [],
      package: initial,
      note: "List prices, no concessions.",
    },
  ];

  let current = initial;
  const applied = [];

  // Explore at most MAX_ROUNDS even if the list package already meets the
  // budget, so published concession chains (e.g. a spare kit that later
  // unlocks a labour discount) can still lower the total. The final package
  // is the lowest feasible result among the rounds, never an invented price.
  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const options = applicableConcessions(need, policies, current);
    if (!options.length) break;
    // Prefer concessions that unlock flags, then those that cut the most cost.
    options.sort((a, b) => {
      const aUnlock = (a.flags_set || []).length;
      const bUnlock = (b.flags_set || []).length;
      if (aUnlock !== bUnlock) return bUnlock - aUnlock;
      return a.price_delta - b.price_delta;
    });
    // Apply all concessions that are valid in this round together, but keep
    // flag-setters first by applying in sorted order via rebuild.
    const nextIds = [...applied, ...options.map((o) => o.id)];
    const next = rebuildWith(need, policies, current, nextIds);
    const newly = options.map((o) => o.id);
    applied.push(...newly);
    current = next;
    rounds.push({
      round,
      concessions_applied: newly,
      package: current,
      note: `Applied ${newly.join(", ")}.`,
    });
  }

  const considered = rounds.map((r) => r.package);
  const feasible = considered.filter((p) => p.meets_budget && p.meets_date);
  const best = (feasible.length ? feasible : considered)
    .slice()
    .sort((a, b) => a.total - b.total)[0];

  const ok = Boolean(best && best.meets_budget && best.meets_date);
  return {
    status: ok ? "composed" : "infeasible",
    reason: ok
      ? undefined
      : !best?.meets_budget
        ? `The lowest package is ${best?.total} ${CURRENCY}, over the budget of ${need.budget} ${CURRENCY}.`
        : `The earliest ready date is ${best?.ready_by}, after ${need.ready_by}.`,
    rounds,
    initialPackage: initial,
    finalPackage: best,
  };
}

export function saturdayNeed(budget = 100) {
  return {
    object: "bicycle",
    ready_by: DEMO_SATURDAY,
    budget,
    currency: CURRENCY,
    constraints: [],
    demo: true,
    label: "A working bicycle before Saturday, under €100",
  };
}

/**
 * SHA-256 hex digest of canonical JSON. Uses Web Crypto in the browser and
 * node:crypto in Node.
 */
export async function hashPolicy(policy) {
  const canonical = JSON.stringify(sortKeys(policy));
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(canonical);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return hex(new Uint8Array(digest));
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(canonical).digest("hex");
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeys(value[key]);
    }
    return out;
  }
  return value;
}

function hex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

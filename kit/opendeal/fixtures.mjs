/** Synthetic Cedarwick policies used by unit tests and, with local origins, by the sites. */

export const REUSE = {
  version: 1,
  origin: "http://localhost:8081",
  site: "Spoke & Salvage",
  role: "reuse",
  currency: "EUR",
  items: [
    {
      id: "cedar-city-7",
      name: "Used city bike, 7-speed, worn brake pads",
      object: "bicycle",
      list_price: 55,
      min_price: 50,
      defects: ["worn_brake_pads"],
      needs_repair: ["brake_service"],
      ready_by: "2027-01-06",
    },
  ],
  concessions: [
    {
      id: "include_spare",
      applies_to: "item:cedar-city-7",
      price_delta: 5,
      flags_set: ["includes_spare"],
      description: "Add a new brake-pad kit to the bike so the workshop does not have to supply pads.",
    },
  ],
};

export const REPAIR = {
  version: 1,
  origin: "http://127.0.0.1:8082",
  site: "Tuesday Workshop",
  role: "repair",
  currency: "EUR",
  services: [
    {
      id: "brake_service",
      name: "Brake service and pad fitment",
      fixes: ["brake_service"],
      list_price: 45,
      min_price: 30,
      ready_by: "2027-01-08",
    },
  ],
  concessions: [
    {
      id: "spare_already_included",
      applies_to: "service:brake_service",
      requires_flags: ["includes_spare"],
      price_delta: -15,
      description: "Labour discount when the shop already includes the pads.",
    },
  ],
};

export const CARGO = {
  version: 1,
  origin: "http://localhost:8083",
  site: "River Runners",
  role: "cargo",
  currency: "EUR",
  services: [
    {
      id: "local_run",
      name: "Shop to workshop to Cedarwick centre",
      list_price: 15,
      min_price: 5,
      ready_by: "2027-01-09",
    },
  ],
  concessions: [
    {
      id: "saturday_pooled_run",
      applies_to: "service:local_run",
      requires_need: { ready_by_weekday: 6 },
      price_delta: -10,
      description: "Pooled Saturday run across Cedarwick.",
    },
  ],
};

export const ALLY = {
  version: 1,
  origin: "http://127.0.0.1:8084",
  site: "Allied Cycles",
  role: "reuse",
  currency: "EUR",
  items: [
    {
      id: "ally-tourer-4",
      name: "Refurbished tourer, already road-ready",
      object: "bicycle",
      list_price: 80,
      min_price: 75,
      defects: [],
      needs_repair: [],
      ready_by: "2027-01-07",
    },
  ],
  concessions: [
    {
      id: "ally-hold-discount",
      applies_to: "item:ally-tourer-4",
      price_delta: -5,
      description: "Discount if the visitor simulates a same-day hold.",
    },
  ],
};

export const ALL = [REUSE, REPAIR, CARGO];

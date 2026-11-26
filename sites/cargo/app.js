
export class ShopPage {
  constructor() {
    this.version = 1;
    this.policy = null;
    this.holds = [];
  }

  async load() {
    const res = await fetch(new URL("./policies/opendeal.json", import.meta.url));
    this.policy = await res.json();
    this.version += 1;
    return this.policy;
  }

  getState() {
    return {
      site: "River Runners",
      role: "cargo",
      fictional: true,
      version: this.version,
      policy: this.policy,
      simulated_holds: this.holds,
      cannot: ["Take payment", "Place a real booking"],
    };
  }

  simulateHold(args) {
    const hold = {
      id: "SIM-" + String(this.holds.length + 1).padStart(3, "0"),
      simulated: true,
      item_or_service: args.targetId,
      note: "Simulation only. Nothing was reserved at a real shop.",
    };
    this.holds.push(hold);
    this.version += 1;
    return { ok: true, hold, version: this.version };
  }
}

export const App = { page: new ShopPage() };
